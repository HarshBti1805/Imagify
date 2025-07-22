import Header from "@/components/shared/Header";
import TransformationForm from "@/components/shared/TransformationForm";
import { transformationTypes } from "@/constants";
import { getUserById, createUser } from "@/lib/actions/user.actions";
import { auth, currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

const AddTransformationTypePage = async ({
  params: { type },
}: SearchParamProps) => {
  const { userId } = auth();
  const user = await currentUser();
  const transformation = transformationTypes[type];

  if (!userId) redirect("/sign-in");

  // Try to get user from database
  let dbUser;
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

  return (
    <>
      <Header title={transformation.title} subtitle={transformation.subTitle} />

      <section className="mt-10">
        <TransformationForm
          action="Add"
          userId={dbUser._id}
          type={transformation.type as TransformationTypeKey}
          creditBalance={dbUser.creditBalance}
        />
      </section>
    </>
  );
};

export default AddTransformationTypePage;
