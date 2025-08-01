import { auth, currentUser } from "@clerk/nextjs";
import Image from "next/image";
import { redirect } from "next/navigation";

import { Collection } from "@/components/shared/Collection";
import Header from "@/components/shared/Header";
import { getUserImages } from "@/lib/actions/image.actions";
import { getUserById, createUser } from "@/lib/actions/user.actions";

const Profile = async ({ searchParams }: SearchParamProps) => {
  const page = Number(searchParams?.page) || 1;
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

  // At this point, dbUser is guaranteed to be defined
  const userData = dbUser;

  const images = await getUserImages({ page, userId: userData._id });

  return (
    <>
      <Header title="Profile" />

      <section className="profile">
        <div className="profile-balance">
          <p className="p-14-medium md:p-16-medium">CREDITS AVAILABLE</p>
          <div className="mt-4 flex items-center gap-4">
            <Image
              src="/assets/icons/coins.svg"
              alt="coins"
              width={50}
              height={50}
              className="size-9 md:size-12"
            />
            <h2 className="h2-bold text-dark-600">{userData.creditBalance}</h2>
          </div>
        </div>

        <div className="profile-image-manipulation">
          <p className="p-14-medium md:p-16-medium">IMAGE MANIPULATION DONE</p>
          <div className="mt-4 flex items-center gap-4">
            <Image
              src="/assets/icons/photo.svg"
              alt="coins"
              width={50}
              height={50}
              className="size-9 md:size-12"
            />
            <h2 className="h2-bold text-dark-600">{images?.data.length}</h2>
          </div>
        </div>
      </section>

      <section className="mt-8 md:mt-14">
        <Collection
          images={images?.data}
          totalPages={images?.totalPages}
          page={page}
        />
      </section>
    </>
  );
};

export default Profile;
