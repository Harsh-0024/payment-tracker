import { useState } from "react";
import Split from "./Split";
import GroupsPage from "./GroupsPage";

export default function SplitHub(props) {
  const [tab, setTab] = useState("groups");

  return (
    <>
      <div
        className="hub-head"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div className="seg">
          <button type="button" className={tab === "groups" ? "on" : ""}
            onClick={() => setTab("groups")}>Groups</button>
          <button type="button" className={tab === "quick" ? "on" : ""}
            onClick={() => setTab("quick")}>Quick split</button>
        </div>
        <button type="button" className="ghost hub-add" onClick={props.goFriends}>
          + Add friend
        </button>
      </div>

      {tab === "groups" ? (
        <GroupsPage
          friends={props.friends}
          setError={props.setError}
          myName={props.myName}
          goFriends={props.goFriends}
        />
      ) : (
        <Split {...props} />
      )}
    </>
  );
}