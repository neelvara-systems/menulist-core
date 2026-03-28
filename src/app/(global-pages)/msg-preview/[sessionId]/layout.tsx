/**
 * Preview Page Layout — noindex/nofollow meta tags
 * @see __docs__/messaging-onboarding/messaging-onboarding_spec.md §Preview Page §Security
 */

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menu Preview — MenuList",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MsgPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
