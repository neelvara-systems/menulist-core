import SelectedItemCheck from '@atoms/selectedItemCheck';
import { IMAGE_GENERATION_STYLES } from '@constant/AI';
import { resolveBusinessCategory } from '@data/shared/businessTypes';
import useDeviceType from '@hook/useDeviceType';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Flex, Modal, Tag, Typography, theme } from 'antd';
import React, { useContext, useEffect, useMemo } from 'react';
import { LuCheckCircle, LuStar, LuX } from 'react-icons/lu';
import { NavBar, Popup } from '../../../../../mobile/antd';

const { Text } = Typography;

export interface StyleSelectorProps {
  selectedStyles: string[];
  stylesCategory: string;
  onChange: (styles: string[], stylesCategory: string) => void;
  open: boolean;
  setShowStyleSelector: (show: boolean) => void;
  businessType?: string;
  businessCategory?: string;
}

interface StyleOption {
  name: string;
  description: string;
  bestFor?: string[];
  recommended?: string[];
}

const STYLE_RECOMMENDATIONS: Record<string, { bestFor: string; recommended: string[] }> = {
  'Natural Light': { bestFor: 'Food, products, and everyday menu photos', recommended: ['Restaurant', 'Cafe', 'Bakery', 'Coffee Shop'] },
  'Food Photography': { bestFor: 'Food menus and delivery photos', recommended: ['Restaurant', 'Cafe', 'Bakery', 'Cake Shop', 'Ice Cream Shop'] },
  'Studio Lighting': { bestFor: 'Clean product and catalog photos', recommended: ['Jewelry Store', 'Boutique', 'Electronics Store'] },
  'Product Photography': { bestFor: 'Retail and ecommerce items', recommended: ['Boutique', 'Furniture Store', 'Electronics Store'] },
  'Shallow Depth of Field / Bokeh': { bestFor: 'Premium food, salon, and lifestyle photos', recommended: ['Salon', 'Spa', 'Restaurant', 'Cafe'] },
  'Macro Photography': { bestFor: 'Close-up details and textures', recommended: ['Tattoo Studio', 'Jewelry Store', 'Bakery'] },
  'Cinematic Lighting': { bestFor: 'Dramatic, premium-looking photos', recommended: ['Restaurant', 'Spa', 'Gym'] },
  'Top-Down / Flat Lay': { bestFor: 'Menu layouts, bowls, plates, and sets', recommended: ['Restaurant', 'Cafe', 'Bakery'] },
  'Digital Painting': { bestFor: 'Illustrated or artistic concepts', recommended: ['Art Studio', 'Creative Agency'] },
  'Watercolor': { bestFor: 'Soft, gentle, artistic visuals', recommended: ['Florist', 'Wedding Planner', 'Spa'] },
  'Minimalist': { bestFor: 'Clean modern visuals', recommended: ['Tech', 'Modern', 'Boutique'] },
  'Vintage / Retro': { bestFor: 'Classic or nostalgic looks', recommended: ['Cafe', 'Boutique', 'Bar'] },
  'High Contrast': { bestFor: 'Bold and strong visuals', recommended: ['Gym', 'Sports', 'Restaurant'] },
  'Soft Focus': { bestFor: 'Gentle, calm, premium visuals', recommended: ['Spa', 'Salon', 'Wedding Planner'] },
};

const CATEGORY_STYLE_RECOMMENDATIONS: Record<string, string[]> = {
  creative: ['Natural Light', 'Macro Photography', 'Watercolor'],
  food: ['Natural Light', 'Food Photography', 'Top-Down / Flat Lay', 'Shallow Depth of Field / Bokeh'],
  health: ['Natural Light', 'Shallow Depth of Field / Bokeh', 'Cinematic Lighting'],
  professional: ['Natural Light', 'Minimalist'],
  retail: ['Studio Lighting', 'Product Photography', 'Minimalist'],
  service: ['Natural Light', 'Shallow Depth of Field / Bokeh', 'Soft Focus'],
  specialty: ['Natural Light', 'Minimalist'],
};

const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyles, stylesCategory, onChange, open, setShowStyleSelector, businessType, businessCategory }) => {
  const { token } = theme.useToken();
  const { isMobile } = useDeviceType();
  const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
  const effectiveBusinessType = businessType || storeDetails?.businessType;
  const effectiveBusinessCategory = resolveBusinessCategory(effectiveBusinessType, businessCategory || storeDetails?.businessCategory);
  const [localCategory, setLocalCategory] = React.useState<string>(stylesCategory);
  const [localSelectedStyles, setLocalSelectedStyles] = React.useState<string[]>(selectedStyles || []);
  const [hasAutoSelected, setHasAutoSelected] = React.useState(false);

  const isRecommendedForBusiness = (styleName: string): boolean => {
    const rec = STYLE_RECOMMENDATIONS[styleName];
    const typeMatch = rec && effectiveBusinessType
      ? rec.recommended.some(b => effectiveBusinessType?.toLowerCase().includes(b.toLowerCase()))
      : false;
    const categoryMatch = effectiveBusinessCategory
      ? CATEGORY_STYLE_RECOMMENDATIONS[effectiveBusinessCategory]?.includes(styleName)
      : false;
    return Boolean(typeMatch || categoryMatch);
  };

  const recommendedStyles = useMemo(() => {
    return Object.keys(STYLE_RECOMMENDATIONS).filter(isRecommendedForBusiness);
  }, [effectiveBusinessType, effectiveBusinessCategory]);

  // UX-07: Auto-select first recommended style if none selected
  useEffect(() => {
    if (open && !hasAutoSelected && selectedStyles.length === 0 && recommendedStyles.length > 0) {
      setLocalSelectedStyles([recommendedStyles[0]]);
      setHasAutoSelected(true);
    }
  }, [open, recommendedStyles, selectedStyles, hasAutoSelected]);

  useEffect(() => {
    if (open) {
      setLocalCategory(stylesCategory);
      setLocalSelectedStyles(selectedStyles || []);
      setHasAutoSelected(false);
    }
  }, [open, stylesCategory, selectedStyles]);

  const handleStyleToggle = (styleName: string) => {
    setLocalSelectedStyles(prev =>
      prev.includes(styleName)
        ? prev.filter(s => s !== styleName)
        : [...prev, styleName]
    );
  };

  const handleCategoryChange = (categoryName: string) => {
    setLocalCategory(categoryName);
    // Don't clear selections when switching tabs - let users select from multiple categories
  };

  const handleSubmit = () => {
    onChange(localSelectedStyles, localCategory);
    setShowStyleSelector(false);
  };

  const activeCategoryIndex = Math.max(IMAGE_GENERATION_STYLES.findIndex(cat => cat.category === localCategory), 0);
  const activeCategory = IMAGE_GENERATION_STYLES[activeCategoryIndex] || IMAGE_GENERATION_STYLES[0];
  const mobileFooterButtonStyle = isMobile
    ? {
      flex: 1,
      minHeight: 48,
      minWidth: 0,
    }
    : undefined;

  const renderStyleCard = (style: StyleOption, isSelected: boolean, compact = false) => {
    const isRecommended = isRecommendedForBusiness(style.name);
    const styleInfo = STYLE_RECOMMENDATIONS[style.name];

    return (
      <div
        key={style.name}
        onClick={() => handleStyleToggle(style.name)}
        style={{
          width: '100%',
          cursor: 'pointer',
          borderRadius: 8,
          border: `1px solid ${isSelected ? token.colorPrimary : isRecommended ? token.colorWarningBorder : token.colorBorderSecondary}`,
          padding: compact ? '10px 12px' : 12,
          transition: 'all 0.2s ease',
          background: token.colorFillAlter,
        }}
      >
        <Flex align="flex-start" gap={10}>
          <Flex
            align="center"
            justify="center"
            style={{
              background: 'transparent',
              border: `1px solid ${isSelected ? token.colorPrimary : token.colorBorder}`,
              borderRadius: '999px',
              color: isSelected ? token.colorPrimary : token.colorTextSecondary,
              flex: '0 0 auto',
              height: 24,
              width: 24,
            }}
          >
            <LuCheckCircle size={12} />
          </Flex>
          <Flex align="flex-start" justify="space-between" gap={8} style={{ flex: 1, minWidth: 0 }}>
            <Flex gap={4} style={{ minWidth: 0 }} vertical>
              <Text strong style={{ color: isSelected ? token.colorPrimary : undefined, lineHeight: 1.25 }}>{style.name}</Text>
              {styleInfo ? (
                <Text style={{ color: token.colorTextSecondary, fontSize: 12, lineHeight: 1.3 }}>
                  Good for: {styleInfo.bestFor}
                </Text>
              ) : null}
              <Text type="secondary" style={{ fontSize: 12, marginTop: compact ? 2 : 4, display: 'block', lineHeight: 1.4, wordWrap: 'break-word', whiteSpace: 'normal' }}>
                {style.description}
              </Text>
            </Flex>
            {styleInfo ? (
              <Flex align="center" gap={6} style={{ flex: '0 0 auto' }}>
                {isRecommended && (
                  <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>
                    <LuStar style={{ marginRight: 2 }} /> Recommended
                  </Tag>
                )}
              </Flex>
            ) : null}
          </Flex>
        </Flex>
      </div>
    );
  };

  const renderCategoryPicker = () => (
    <Flex gap={8} style={{ overflowX: 'auto', paddingBottom: 2, width: '100%' }}>
      {IMAGE_GENERATION_STYLES.map((category) => {
        const isActive = category.category === localCategory;
        return (
          <Button
            key={category.category}
            onClick={() => handleCategoryChange(category.category)}
            shape="round"
            type={isActive ? 'primary' : 'default'}
            style={{ flex: '0 0 auto' }}
          >
            {category.category}
          </Button>
        );
      })}
    </Flex>
  );

  const renderRecommendedSection = () => {
    const recommendedOptions = recommendedStyles
      .map((styleName) => IMAGE_GENERATION_STYLES.flatMap((category) => category.styles).find((style) => style.name === styleName))
      .filter(Boolean)
      .slice(0, 3) as StyleOption[];

    if (!recommendedOptions.length) return null;

    return (
      <Flex gap={8} vertical>
        <Flex align="center" justify="space-between">
          <Text strong>Recommended for your business</Text>
          {effectiveBusinessType ? <Text type="secondary" style={{ fontSize: 12 }}>{effectiveBusinessType}</Text> : null}
        </Flex>
        <Flex gap={8} vertical>
          {recommendedOptions.map((style) => renderStyleCard(style, localSelectedStyles.includes(style.name), true))}
        </Flex>
      </Flex>
    );
  };

  const renderStyleList = () => (
    <Flex gap={12} vertical>
      <Flex gap={4} vertical>
        <Text strong>Choose a style</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Select one or more looks. Natural Light is usually the easiest choice for menu photos.
        </Text>
      </Flex>
      {renderCategoryPicker()}
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
        }}
      >
        {activeCategory.styles.map(style => {
          const isSelected = (localSelectedStyles || []).includes(style.name);
          return renderStyleCard(style, isSelected);
        })}
      </div>
    </Flex>
  );

  const renderContent = () => (
    <Flex gap={16} vertical>
      <Flex
        align={isMobile ? 'stretch' : 'center'}
        gap={10}
        justify="space-between"
        style={{
          background: token.colorFillAlter,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 8,
          padding: 12,
        }}
        vertical={isMobile}
      >
        <Flex gap={4} vertical>
          <Text strong>Pick the image look</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            This only changes the visual style. You can change it anytime before generating.
          </Text>
        </Flex>
        {localSelectedStyles.length > 0 ? (
          <Flex align="center" gap={8} wrap="wrap">
            <Tag color="blue" style={{ margin: 0 }}>{localSelectedStyles.length} selected</Tag>
            <Button
              type="text"
              danger
              size="small"
              icon={<LuX size={12} />}
              onClick={() => setLocalSelectedStyles([])}
              style={{ fontSize: 12, fontWeight: 500, paddingInline: 4 }}
            >
              Clear
            </Button>
          </Flex>
        ) : null}
      </Flex>
      {renderRecommendedSection()}
      {renderStyleList()}
    </Flex>
  );

  const footer = (
    <Flex gap={8} justify="flex-end">
      <Button
        key="cancel"
        type="default"
        icon={<LuX />}
        onClick={() => setShowStyleSelector(false)}
        style={mobileFooterButtonStyle || { minWidth: 96 }}
      >
        Cancel
      </Button>
      <Button
        key="submit"
        type="primary"
        icon={<LuCheckCircle />}
        onClick={handleSubmit}
        disabled={localSelectedStyles.length === 0}
        style={mobileFooterButtonStyle || { minWidth: 120 }}
      >
        {localSelectedStyles.length === 0 ? 'Select a style' : `Use ${localSelectedStyles.length} style${localSelectedStyles.length > 1 ? 's' : ''}`}
      </Button>
    </Flex>
  );

  if (isMobile) {
    return (
      <Popup
        bodyStyle={{ minHeight: '72vh', maxHeight: '92vh', overflowX: 'hidden', padding: 0 }}
        destroyOnClose
        onMaskClick={() => setShowStyleSelector(false)}
        visible={open}
      >
        <Flex style={{ height: '100%' }} vertical>
          <NavBar onBack={() => setShowStyleSelector(false)}>Image Style</NavBar>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 16px' }}>
            {renderContent()}
          </div>
          <div
            style={{
              backgroundColor: token.colorBgContainer,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              padding: '12px 12px calc(12px + env(safe-area-inset-bottom))',
            }}
          >
            {footer}
          </div>
        </Flex>
      </Popup>
    );
  }

  return (
    <Modal
      title="Choose Image Style"
      open={open}
      footer={footer}
      onCancel={() => setShowStyleSelector(false)}
      width={760}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 220px)',
          overflowY: 'auto',
          paddingTop: 12,
        },
      }}
    >
      {renderContent()}
    </Modal>
  );
};

export default StyleSelector;
