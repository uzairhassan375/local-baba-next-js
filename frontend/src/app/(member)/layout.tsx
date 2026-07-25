import { MemberShell } from "./MemberShell";

export const dynamic = "force-dynamic";

export default function MemberSectionLayout({ children }: { children: React.ReactNode }) {
  return <MemberShell>{children}</MemberShell>;
}
