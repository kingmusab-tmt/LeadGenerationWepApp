import TicketStatusForm from "../components/generalComponent/TicketStatusForm";
import Head from "next/head";

export default function FollowUpPage() {
  return (
    <>
      <Head>
        <title>Follow Up Ticket | YourApp</title>
      </Head>
      <main>
        <TicketStatusForm />
      </main>
    </>
  );
}
