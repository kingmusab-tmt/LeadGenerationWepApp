// pages/support.tsx
"use client";
import TicketForm from "../components/generalComponent/ticketForm";
import Head from "next/head";

export default function SupportPage() {
  return (
    <>
      <Head>
        <title>Support | YourApp</title>
      </Head>
      <main>
        <TicketForm />
      </main>
    </>
  );
}
