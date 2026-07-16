import FlowStepButtons from "./FlowStepButtons";

// The brand wordmark, the ☀️/🌙 switch, and all site links now live in the one
// CrossHeartPray header (ChpProductNav, mounted in layout.tsx), and the Bible
// shortcut moved into the footer. This header keeps only the Back/Next flow
// buttons for the Cross → Heart → Pray journey; FlowStepButtons renders nothing
// on the home page and on pages outside that flow.
export default function SiteHeader() {
  return <FlowStepButtons />;
}
