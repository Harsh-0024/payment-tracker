import { useState, lazy, Suspense } from "react";
import PaymentsPage from "./PaymentsPage";
import ChatBot from "./ChatBot";
import GlobalSearch from "./GlobalSearch";

// The pay/scan tab pulls in the camera QR reader: load it on first open.
const PayPage = lazy(() => import("./PayPage"));

export default function PaymentsHub(props) {
  const [tab, setTab] = useState("payments");

  return (
    <>
      <GlobalSearch entries={props.entries} friends={props.friends} />

      <div className="seg" style={{ marginBottom: 8 }}>
        <button type="button" className={tab === "payments" ? "on" : ""}
          onClick={() => setTab("payments")}>Payments</button>
        <button type="button" className={tab === "pay" ? "on" : ""}
          onClick={() => setTab("pay")}>Pay now</button>
      </div>

      {tab === "payments" ? <PaymentsPage {...props} /> : <Suspense fallback={null}><PayPage {...props} /></Suspense>}

      <ChatBot entries={props.entries} friends={props.friends} />
    </>
  );
}
