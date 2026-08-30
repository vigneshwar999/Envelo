/** The brand mark: a wax seal pressed over an envelope. */
import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import colors from "@/constants/colors";

export function WaxSeal(props: { size?: number; color?: string }) {
  const size = props.size ?? 56;
  const wax = props.color ?? colors.light.seal;
  const impression = "#F8E7C9";
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* wax blob: main disc plus irregular lobes */}
      <Circle cx={32} cy={32} r={24} fill={wax} />
      <Circle cx={13} cy={27} r={6.5} fill={wax} />
      <Circle cx={50} cy={22} r={5.5} fill={wax} />
      <Circle cx={20} cy={51} r={5.5} fill={wax} />
      <Circle cx={48} cy={47} r={6.5} fill={wax} />
      {/* pressed ring */}
      <Circle cx={32} cy={32} r={17.5} fill="none" stroke={impression} strokeWidth={2} opacity={0.9} />
      {/* envelope impression */}
      <Path
        d="M23.5 27.5 h17 v11.5 h-17 z"
        fill="none"
        stroke={impression}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M23.5 27.5 l8.5 6.5 l8.5 -6.5"
        fill="none"
        stroke={impression}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
