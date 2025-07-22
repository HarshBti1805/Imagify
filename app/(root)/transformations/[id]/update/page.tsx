import { auth, currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import Header from "@/components/shared/Header";
import TransformationForm from "@/components/shared/TransformationForm";
import { transformationTypes } from "@/constants";
import { getUserById, createUser } from "@/lib/actions/user.actions";
import { getImageById } from "@/lib/actions/image.actions";

const Page = async ({ params: { id } }: SearchParamProps) => {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId) redirect("/sign-in");

  // Try to get user from database
  let dbUser: User | undefined;
  try {
    dbUser = await getUserById(userId);
  } catch (error) {
    // If user doesn't exist in database, create them
    if (user) {
      const newUser = {
        clerkId: userId,
        email: user.emailAddresses[0]?.emailAddress || "",
        username: user.username || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        photo: user.imageUrl,
      };

      dbUser = await createUser(newUser);
    } else {
      // If we can't get user info from Clerk, redirect to sign-in
      redirect("/sign-in");
    }
  }

  if (!dbUser) {
    redirect("/sign-in");
  }

  const image = await getImageById(id);

  const transformation =
    transformationTypes[image.transformationType as TransformationTypeKey];

  return (
    <>
      <Header title={transformation.title} subtitle={transformation.subTitle} />

      <section className="mt-10">
        <TransformationForm
          action="Update"
          userId={dbUser._id}
          type={image.transformationType as TransformationTypeKey}
          creditBalance={dbUser.creditBalance}
          config={image.config}
          data={image}
        />
      </section>
    </>
  );
};

export default Page;
