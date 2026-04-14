import "./globals.css";

export const metadata = {
  title: "Alert Manager — Crypto Price Alerts",
  description: "Real-time crypto price alerts with Telegram, Web Push, and more. Monitor Kraken markets with Bollinger Bands and custom thresholds.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
