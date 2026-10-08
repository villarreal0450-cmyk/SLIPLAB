import { ProfileView } from "@/components/auth/ProfileView";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" />
      <ProfileView />
    </>
  );
}
