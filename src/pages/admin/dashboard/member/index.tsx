
import { FLEET_COLORS } from "../../fleetMaintenance/colorUtils";

const MembersPlaceholder = () => {
  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center rounded-2xl"
      style={{
        background: FLEET_COLORS.gradientVertical,
        color: "#fff",
        boxShadow: `0 25px 50px ${FLEET_COLORS.focusRing}`,
      }}
    >
      <p className="text-2xl font-semibold">Members module coming soon</p>
      <p className="text-sm opacity-90">Theme now powered by shared fleet colors.</p>
    </div>
  );
};

export default MembersPlaceholder;