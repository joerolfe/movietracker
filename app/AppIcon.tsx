/** Shared artwork for the generated app icons: the green dot on the app's dark background. */
export function AppIcon({ size, rounded }: { size: number; rounded: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#14181c",
        borderRadius: rounded ? size * 0.22 : 0,
      }}
    >
      <div style={{ width: size * 0.42, height: size * 0.42, borderRadius: "50%", background: "#00e054" }} />
    </div>
  );
}
