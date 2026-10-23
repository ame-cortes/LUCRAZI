import type { Metadata } from "next";
import QrCodeDashboard from "@/components/qr-code-dashboard";

export const metadata: Metadata = {
  title: "Meus QR Codes",
  robots: { index: false, follow: false },
};

export default function MyAccountPage() {
  return <QrCodeDashboard />;
}
