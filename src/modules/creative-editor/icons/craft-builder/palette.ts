type CraftIconPalette = {
    colorBgBase: string;
    colorBgSpotlight: string;
    colorBorder: string;
    colorPrimary: string;
    colorPrimaryBgHover: string;
    colorPrimaryBorder: string;
    colorPrimaryBorderHover: string;
    colorPrimaryHover: string;
    colorTextBase: string;
    colorTextDescription: string;
    colorTextHeading: string;
    colorTextLabel: string;
};

export const getCraftIconPalette = (active: boolean): CraftIconPalette => ({
    colorBgBase: active ? "var(--craft-icon-active-cutout)" : "var(--craft-icon-cutout)",
    colorBgSpotlight: active ? "var(--craft-icon-active-soft)" : "var(--craft-icon-soft)",
    colorBorder: active ? "var(--craft-icon-active-border)" : "var(--craft-icon-border)",
    colorPrimary: active ? "var(--craft-icon-active-primary)" : "var(--craft-icon-primary)",
    colorPrimaryBgHover: active ? "var(--craft-icon-active-soft)" : "var(--craft-icon-soft)",
    colorPrimaryBorder: active ? "var(--craft-icon-active-border)" : "var(--craft-icon-border)",
    colorPrimaryBorderHover: active ? "var(--craft-icon-active-border)" : "var(--craft-icon-border)",
    colorPrimaryHover: active ? "var(--craft-icon-active-primary)" : "var(--craft-icon-primary)",
    colorTextBase: active ? "var(--craft-icon-active-cutout)" : "var(--craft-icon-cutout)",
    colorTextDescription: active ? "var(--craft-icon-active-muted)" : "var(--craft-icon-muted)",
    colorTextHeading: active ? "var(--craft-icon-active-strong)" : "var(--craft-icon-strong)",
    colorTextLabel: active ? "var(--craft-icon-active-label)" : "var(--craft-icon-label)",
});
