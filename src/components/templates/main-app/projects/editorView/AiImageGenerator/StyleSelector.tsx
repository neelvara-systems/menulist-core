import SelectedItemCheck from '@atoms/selectedItemCheck';
import { IMAGE_GENERATION_STYLES } from '@constant/AI';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Flex, Modal, Tabs, Tag, Typography, theme } from 'antd';
import React, { useContext, useEffect, useMemo } from 'react';
import { LuCheckCircle, LuSparkles, LuStar, LuX } from 'react-icons/lu';

const { Text } = Typography;

export interface StyleSelectorProps {
  selectedStyles: string[];
  stylesCategory: string;
  onChange: (styles: string[], stylesCategory: string) => void;
  open: boolean;
  setShowStyleSelector: (show: boolean) => void;
  businessType?: string;
}

interface StyleOption {
  name: string;
  description: string;
  bestFor?: string[];
  recommended?: string[];
}

const STYLE_RECOMMENDATIONS: Record<string, { bestFor: string; recommended: string[]; preview: string }> = {
  'Natural Light': { bestFor: '🍔 Food & Products', recommended: ['Restaurant', 'Cafe', 'Bakery', 'Coffee Shop'], preview: '☀️' },
  'Food Photography': { bestFor: '🍕 Food Businesses', recommended: ['Restaurant', 'Cafe', 'Bakery', 'Cake Shop', 'Ice Cream Shop'], preview: '🍽️' },
  'Studio Lighting': { bestFor: '💎 Products & Jewelry', recommended: ['Jewelry Store', 'Boutique', 'Electronics Store'], preview: '💡' },
  'Product Photography': { bestFor: '🛍️ Retail & E-commerce', recommended: ['Boutique', 'Furniture Store', 'Electronics Store'], preview: '📦' },
  'Shallow Depth of Field / Bokeh': { bestFor: '📸 Portraits & Food', recommended: ['Salon', 'Spa', 'Restaurant', 'Cafe'], preview: '🔍' },
  'Macro Photography': { bestFor: '💅 Details & Textures', recommended: ['Tattoo Studio', 'Jewelry Store', 'Bakery'], preview: '🔬' },
  'Cinematic Lighting': { bestFor: '🎬 Dramatic Shots', recommended: ['Restaurant', 'Spa', 'Gym'], preview: '🎬' },
  'Top-Down / Flat Lay': { bestFor: '🍽️ Food & Layouts', recommended: ['Restaurant', 'Cafe', 'Bakery'], preview: '⬇️' },
  'Digital Painting': { bestFor: '🎨 Creative & Artistic', recommended: ['Art Studio', 'Creative Agency'], preview: '🖌️' },
  'Watercolor': { bestFor: '🌸 Soft & Artistic', recommended: ['Florist', 'Wedding Planner', 'Spa'], preview: '🎨' },
  'Minimalist': { bestFor: '✨ Clean & Modern', recommended: ['Tech', 'Modern', 'Boutique'], preview: '◻️' },
  'Vintage / Retro': { bestFor: '📼 Nostalgic Look', recommended: ['Cafe', 'Boutique', 'Bar'], preview: '📷' },
  'High Contrast': { bestFor: '⚫ Bold & Dramatic', recommended: ['Gym', 'Sports', 'Restaurant'], preview: '🎯' },
  'Soft Focus': { bestFor: '💫 Dreamy & Gentle', recommended: ['Spa', 'Salon', 'Wedding Planner'], preview: '✨' },
};

const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyles, stylesCategory, onChange, open, setShowStyleSelector, businessType }) => {
  const { token } = theme.useToken();
  const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
  const effectiveBusinessType = businessType || storeDetails?.businessType;
  const [localCategory, setLocalCategory] = React.useState<string>(stylesCategory);
  const [localSelectedStyles, setLocalSelectedStyles] = React.useState<string[]>(selectedStyles || []);
  const [hasAutoSelected, setHasAutoSelected] = React.useState(false);

  const isRecommendedForBusiness = (styleName: string): boolean => {
    const rec = STYLE_RECOMMENDATIONS[styleName];
    if (!rec || !effectiveBusinessType) return false;
    return rec.recommended.some(b => effectiveBusinessType?.toLowerCase().includes(b.toLowerCase()));
  };

  const recommendedStyles = useMemo(() => {
    return Object.keys(STYLE_RECOMMENDATIONS).filter(isRecommendedForBusiness);
  }, [effectiveBusinessType]);

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

  const renderStyleCard = (style: StyleOption, isSelected: boolean) => {
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
          border: `2px solid ${isSelected ? token.colorPrimary : isRecommended ? token.colorWarningBorder : token.colorBorder}`,
          position: 'relative',
          padding: 12,
          transition: 'all 0.3s ease',
          backgroundColor: isRecommended ? token.colorWarningBg : 'transparent',
        }}
      >
        <SelectedItemCheck active={isSelected} />
        <Flex align="center" justify="space-between" gap={8}>
          <Flex align="center" gap={8}>
            {styleInfo?.preview && (
              <span style={{ fontSize: 20 }}>{styleInfo.preview}</span>
            )}
            <Text strong>{style.name}</Text>
            {isRecommended && (
              <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>
                <LuStar style={{ marginRight: 2 }} /> Recommended
              </Tag>
            )}
          </Flex>
        </Flex>
        {styleInfo && (
          <Text style={{ fontSize: 11, color: token.colorTextSecondary, display: 'block', marginTop: 4 }}>
            {styleInfo.bestFor}
          </Text>
        )}
        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block', wordWrap: 'break-word', whiteSpace: 'normal' }}>
          {style.description}
        </Text>
      </div>
    );
  };

  const renderTabContent = (categoryIndex: number) => {
    const category = IMAGE_GENERATION_STYLES[categoryIndex];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflow: 'auto', padding: 12 }}>
        {category.styles.map(style => {
          const isSelected = (localSelectedStyles || []).includes(style.name);
          return renderStyleCard(style, isSelected);
        })}
      </div>
    );
  };

  return (
    <Modal
      title={
        <Flex align="center" justify="space-between" style={{ width: '100%', paddingRight: 32 }}>
          <Flex align="center" gap={8}>
            <LuSparkles />
            <span>Choose Your Image Style</span>
          </Flex>
          {localSelectedStyles.length > 0 && (
            <Flex align="center" gap={8}>
              <Tag color="blue">{localSelectedStyles.length} selected</Tag>
              <Button
                type="text"
                danger
                size="small"
                icon={<LuX size={12} />}
                onClick={() => setLocalSelectedStyles([])}
                style={{ fontSize: 12, fontWeight: 500 }}
              >
                Clear all
              </Button>
            </Flex>
          )}
        </Flex>
      }
      open={open}
      footer={[
        <Button key="cancel" type="default" icon={<LuX />} onClick={() => setShowStyleSelector(false)}>Cancel</Button>,
        <Button
          key="submit"
          type="primary"
          icon={<LuCheckCircle />}
          onClick={handleSubmit}
          disabled={localSelectedStyles.length === 0}
        >
          {localSelectedStyles.length === 0 ? 'Select a Style' : `Apply ${localSelectedStyles.length} Style${localSelectedStyles.length > 1 ? 's' : ''}`}
        </Button>
      ]}
      onCancel={() => setShowStyleSelector(false)}
      width={600}
    >
      {recommendedStyles.length > 0 && (
        <Flex align="center" gap={8} style={{ marginBottom: 12, padding: '8px 12px', backgroundColor: token.colorWarningBg, borderRadius: 8 }}>
          <LuStar style={{ color: token.colorWarning }} />
          <Text style={{ fontSize: 12 }}>
            <strong>Recommended for {storeDetails?.businessType}:</strong> {recommendedStyles.slice(0, 3).join(', ')}
          </Text>
        </Flex>
      )}
      <div style={{ padding: 12 }}>
        <Tabs
          moreIcon={null}
          activeKey={IMAGE_GENERATION_STYLES.findIndex(cat => cat.category === localCategory).toString()}
          onChange={(activeKey) => handleCategoryChange(IMAGE_GENERATION_STYLES[parseInt(activeKey)].category)}
          items={IMAGE_GENERATION_STYLES.map((category, index) => ({
            key: index.toString(),
            label: category.category,
            children: renderTabContent(index)
          }))}
        />
      </div>
    </Modal>
  );
};

export default StyleSelector;
