"use client";

import type {
  HolidayDecorationDensity,
  HolidayMotifConfig
} from "@/lib/holiday/types";
import type { CSSProperties } from "react";

type MotifProps = {
  density?: HolidayDecorationDensity;
  compact?: boolean;
  className?: string;
};

const densityCount: Record<HolidayDecorationDensity, number> = {
  subtle: 5,
  balanced: 8,
  rich: 12
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function FestiveGarlandTop({
  density = "balanced",
  compact = false,
  className
}: MotifProps) {
  const count = densityCount[density];
  return (
    <div
      aria-hidden
      className={cx(
        "wx-festive-garland",
        compact && "wx-festive-garland-compact",
        className
      )}
      data-density={density}
    >
      <span className="wx-festive-garland-cord" />
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="wx-festive-marigold"
          style={{ "--wx-festive-index": index } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function FestiveHangingBellCluster({
  density = "balanced",
  compact = false,
  className
}: MotifProps) {
  const count = density === "rich" ? 5 : density === "balanced" ? 3 : 2;
  return (
    <div
      aria-hidden
      className={cx(
        "wx-festive-bell-cluster",
        compact && "wx-festive-bell-cluster-compact",
        className
      )}
      data-density={density}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="wx-festive-bell-string"
          style={{ "--wx-festive-index": index } as CSSProperties}
        >
          <span className="wx-festive-bell" />
        </span>
      ))}
    </div>
  );
}

export function FestivePaperFanCluster({
  density = "balanced",
  compact = false,
  className
}: MotifProps) {
  return (
    <div
      aria-hidden
      className={cx(
        "wx-festive-paper-fans",
        compact && "wx-festive-paper-fans-compact",
        className
      )}
      data-density={density}
    >
      <span className="wx-festive-paper-fan wx-festive-paper-fan-one" />
      <span className="wx-festive-paper-fan wx-festive-paper-fan-two" />
      {density === "rich" ? (
        <span className="wx-festive-paper-fan wx-festive-paper-fan-three" />
      ) : null}
    </div>
  );
}

export function FestiveLeafVineCorner({
  density = "balanced",
  compact = false,
  className
}: MotifProps) {
  const count = density === "rich" ? 8 : density === "balanced" ? 6 : 4;
  return (
    <div
      aria-hidden
      className={cx(
        "wx-festive-leaf-vine",
        compact && "wx-festive-leaf-vine-compact",
        className
      )}
      data-density={density}
    >
      <span className="wx-festive-vine-stem" />
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="wx-festive-vine-leaf"
          style={{ "--wx-festive-index": index } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function FestiveDiyaGlowLine({
  density = "balanced",
  compact = false,
  className
}: MotifProps) {
  const count = density === "rich" ? 7 : density === "balanced" ? 5 : 3;
  return (
    <div
      aria-hidden
      className={cx(
        "wx-festive-diya-line",
        compact && "wx-festive-diya-line-compact",
        className
      )}
      data-density={density}
    >
      <span className="wx-festive-diya-rule" />
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="wx-festive-diya"
          style={{ "--wx-festive-index": index } as CSSProperties}
        >
          <span className="wx-festive-diya-flame" />
        </span>
      ))}
    </div>
  );
}

export function FestiveWarmLightParticles({
  density = "balanced",
  compact = false,
  className
}: MotifProps) {
  const count = densityCount[density] + (compact ? 0 : 3);
  return (
    <div
      aria-hidden
      className={cx(
        "wx-festive-warm-particles",
        compact && "wx-festive-warm-particles-compact",
        className
      )}
      data-density={density}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="wx-festive-warm-particle"
          style={
            {
              "--wx-festive-index": index,
              left: `${5 + ((index * 19) % 88)}%`,
              top: `${8 + ((index * 23) % 78)}%`
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function FestivalDotField({
  kind,
  density,
  compact = false,
  className
}: MotifProps & { kind: string }) {
  const count = compact
    ? density === "rich"
      ? 9
      : 6
    : density === "rich"
      ? 18
      : density === "balanced"
        ? 12
        : 7;
  return (
    <div
      aria-hidden
      className={cx("wx-festival-dot-field", className)}
      data-kind={kind}
      data-density={density}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          style={
            {
              "--wx-festive-index": index,
              left: `${4 + ((index * 23) % 92)}%`,
              top: `${7 + ((index * 29) % 80)}%`
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function FestivalLightString(props: MotifProps) {
  const count =
    props.density === "rich" ? 16 : props.density === "balanced" ? 11 : 7;
  return (
    <div
      aria-hidden
      className={cx(
        "wx-festival-light-string",
        props.compact && "wx-festival-light-string-compact",
        props.className
      )}
      data-density={props.density}
    >
      <span className="wx-festival-light-cord" />
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="wx-festival-light"
          style={{ "--wx-festive-index": index } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function FestivalLanternCluster(props: MotifProps) {
  const count = props.density === "rich" ? 5 : props.density === "balanced" ? 3 : 2;
  return (
    <div
      aria-hidden
      className={cx("wx-festival-lantern-cluster", props.className)}
      data-density={props.density}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="wx-festival-lantern"
          style={{ "--wx-festive-index": index } as CSSProperties}
        />
      ))}
    </div>
  );
}

export function FestivalAlpanaCorner(props: MotifProps) {
  return (
    <span
      aria-hidden
      className={cx("wx-festival-alpana-corner", props.className)}
      data-density={props.density}
    />
  );
}

export function FestivalRibbonWave(props: MotifProps) {
  return (
    <span
      aria-hidden
      className={cx("wx-festival-ribbon-wave", props.className)}
      data-density={props.density}
    />
  );
}

export function FestivalKiteLayer(props: MotifProps) {
  return (
    <FestivalDotField
      {...props}
      kind="kites"
      className={cx("wx-festival-kite-layer", props.className)}
    />
  );
}

export function FestivalSnowLayer(props: MotifProps) {
  return <FestivalDotField {...props} kind="snow" />;
}

export function FestivalColourBurst(props: MotifProps) {
  return <FestivalDotField {...props} kind="colour-burst" />;
}

export function FestivalFireworkLayer(props: MotifProps) {
  return <FestivalDotField {...props} kind="fireworks" />;
}

export function FestivalConfettiLayer(props: MotifProps) {
  return <FestivalDotField {...props} kind="confetti" />;
}

export function FestivalStarField(props: MotifProps) {
  return <FestivalDotField {...props} kind="stars" />;
}

export function FestivalMoonLanternLayer(props: MotifProps) {
  return (
    <div
      aria-hidden
      className={cx("wx-festival-moon-lantern", props.className)}
      data-density={props.density}
    >
      <span className="wx-festival-crescent" />
      <FestivalLanternCluster {...props} compact />
    </div>
  );
}

export function FestivalFloralCorner(props: MotifProps) {
  return (
    <span
      aria-hidden
      className={cx("wx-festival-floral-corner", props.className)}
      data-density={props.density}
    />
  );
}

export function FestivalHarvestAccent(props: MotifProps) {
  return (
    <span
      aria-hidden
      className={cx("wx-festival-harvest-accent", props.className)}
      data-density={props.density}
    />
  );
}

export function FestivalHeaderSilhouette(props: MotifProps) {
  return (
    <span
      aria-hidden
      className={cx("wx-festival-header-silhouette", props.className)}
      data-density={props.density}
    />
  );
}

export function FestivalDholAccent(props: MotifProps) {
  return (
    <span
      aria-hidden
      className={cx("wx-festival-dhol-accent", props.className)}
      data-density={props.density}
    />
  );
}

function MotifSet({
  motifs,
  density,
  compact = false,
  region
}: {
  motifs: HolidayMotifConfig;
  density: HolidayDecorationDensity;
  compact?: boolean;
  region: string;
}) {
  return (
    <div
      aria-hidden
      className="wx-festive-motif-set"
      data-festive-region={region}
      data-density={density}
    >
      {motifs.garlands ? (
        <FestiveGarlandTop density={density} compact={compact} />
      ) : null}
      {motifs.bells ? (
        <>
          <FestiveHangingBellCluster
            density={density}
            compact={compact}
            className="wx-festive-bells-left"
          />
          {density !== "subtle" ? (
            <FestiveHangingBellCluster
              density={density}
              compact={compact}
              className="wx-festive-bells-right"
            />
          ) : null}
        </>
      ) : null}
      {motifs.paperFans ? (
        <FestivePaperFanCluster density={density} compact={compact} />
      ) : null}
      {motifs.leafVines ? (
        <>
          <FestiveLeafVineCorner
            density={density}
            compact={compact}
            className="wx-festive-vine-left"
          />
          {density === "rich" ? (
            <FestiveLeafVineCorner
              density={density}
              compact={compact}
              className="wx-festive-vine-right"
            />
          ) : null}
        </>
      ) : null}
      {motifs.diyaGlow ? (
        <FestiveDiyaGlowLine density={density} compact={compact} />
      ) : null}
      {motifs.warmParticles ? (
        <FestiveWarmLightParticles density={density} compact={compact} />
      ) : null}
      {motifs.lightStrings ? (
        <FestivalLightString density={density} compact={compact} />
      ) : null}
      {motifs.lanterns ? (
        <FestivalLanternCluster
          density={density}
          compact={compact}
          className="wx-festival-lanterns-left"
        />
      ) : null}
      {motifs.stars ? (
        <FestivalStarField density={density} compact={compact} />
      ) : null}
      {motifs.snow ? (
        <FestivalSnowLayer density={density} compact={compact} />
      ) : null}
      {motifs.colourBursts ? (
        <FestivalColourBurst density={density} compact={compact} />
      ) : null}
      {motifs.fireworks ? (
        <FestivalFireworkLayer density={density} compact={compact} />
      ) : null}
      {motifs.confetti ? (
        <FestivalConfettiLayer density={density} compact={compact} />
      ) : null}
      {motifs.alpana ? (
        <FestivalAlpanaCorner density={density} compact={compact} />
      ) : null}
      {motifs.ribbons ? (
        <FestivalRibbonWave density={density} compact={compact} />
      ) : null}
      {motifs.kites ? (
        <FestivalKiteLayer density={density} compact={compact} />
      ) : null}
      {motifs.moonLanterns ? (
        <FestivalMoonLanternLayer density={density} compact={compact} />
      ) : null}
      {motifs.floralCorners ? (
        <FestivalFloralCorner density={density} compact={compact} />
      ) : null}
      {motifs.harvest ? (
        <FestivalHarvestAccent density={density} compact={compact} />
      ) : null}
      {motifs.silhouettes ? (
        <FestivalHeaderSilhouette density={density} compact={compact} />
      ) : null}
      {motifs.dholAccent ? (
        <FestivalDholAccent density={density} compact={compact} />
      ) : null}
    </div>
  );
}

type LayerProps = {
  motifs: HolidayMotifConfig;
  density: HolidayDecorationDensity;
};

export function FestiveHeaderLayer({ motifs, density }: LayerProps) {
  return (
    <div
      aria-hidden
      className="wx-festive-region wx-festive-header-layer pointer-events-none absolute inset-x-0 top-0 overflow-visible"
    >
      <MotifSet motifs={motifs} density={density} compact region="header" />
    </div>
  );
}

export function FestiveHeroLayer({ motifs, density }: LayerProps) {
  return (
    <div
      aria-hidden
      className="wx-festive-region wx-festive-hero-layer pointer-events-none absolute inset-x-0 top-[var(--wx-header-height)] z-[1] overflow-hidden"
    >
      <MotifSet motifs={motifs} density={density} region="hero" />
    </div>
  );
}

export function FestiveSectionCornerLayer({ motifs, density }: LayerProps) {
  return (
    <div
      aria-hidden
      className="wx-festive-region wx-festive-section-layer pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      <MotifSet motifs={motifs} density={density} compact region="section" />
    </div>
  );
}

export function FestiveFooterLayer({ motifs, density }: LayerProps) {
  return (
    <div
      aria-hidden
      className="wx-festive-region wx-festive-footer-layer pointer-events-none absolute inset-x-0 top-0 overflow-visible"
    >
      <MotifSet motifs={motifs} density={density} compact region="footer" />
    </div>
  );
}

export function FestiveLoginLayer({ motifs, density }: LayerProps) {
  return (
    <div
      aria-hidden
      className="wx-festive-region wx-festive-login-layer pointer-events-none absolute inset-0 z-[8] overflow-hidden"
    >
      <MotifSet motifs={motifs} density={density} region="login" />
    </div>
  );
}

export function FestiveAxoCostumeLayer({ motifs, density }: LayerProps) {
  return (
    <span
      aria-hidden
      className="wx-festive-region wx-festive-axo-costume pointer-events-none absolute inset-0 z-20"
    >
      {motifs.garlands || motifs.paperFans ? (
        <span className="wx-festive-axo-crown">
          <span />
          <span />
          <span />
        </span>
      ) : null}
      {motifs.bells ? <span className="wx-festive-axo-bell" /> : null}
      {motifs.diyaGlow || motifs.warmParticles ? (
        <span className="wx-festive-axo-glow" data-density={density} />
      ) : null}
    </span>
  );
}
