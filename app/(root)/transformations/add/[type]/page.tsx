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

  if (!userId) redirect("/sign-in");

  // Ensure 'type' is a valid key of transformationTypes
  const transformation =
    transformationTypes[type as keyof typeof transformationTypes];

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

  // At this point, dbUser is guaranteed to be defined
  const userData = dbUser;

  return (
    <>
      <Header title={transformation.title} subtitle={transformation.subTitle} />

      <section className="mt-10">
        <TransformationForm
          action="Add"
          userId={userData._id}
          type={transformation.type as TransformationTypeKey}
          creditBalance={userData.creditBalance}
        />
      </section>
    </>
  );
};

export default AddTransformationTypePage;
