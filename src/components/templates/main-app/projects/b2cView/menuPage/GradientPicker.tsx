import { Button, ColorPicker, Flex, Radio, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { LuMinus, LuPlus } from 'react-icons/lu';
import { generateGradientString, parseGradientString } from './gradientUtils';

interface GradientColor {
  color: string;
  position: number;
}

interface GradientPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  onOpenColorPresets?: () => void;
}

export default function GradientPicker({ value, onChange, onOpenColorPresets }: GradientPickerProps) {
  // Gradient state
  const [gradientAngle, setGradientAngle] = useState<number>(45);
  const [gradientColors, setGradientColors] = useState<GradientColor[]>([
    { color: '#00F5A0', position: 0 },
    { color: '#00D9F5', position: 100 }
  ]);

  // Parse existing gradient if present
  useEffect(() => {
    if (!value || !value.includes('linear-gradient')) return;

    const result = parseGradientString(value);
    if (result) {
      setGradientAngle(result.angle);
      setGradientColors(result.colors);
    }
  }, [value]);

  // Add a new color to gradient
  const addGradientColor = () => {
    if (gradientColors.length >= 4) return; // Max 4 colors

    // Calculate middle position for new color
    const positions = gradientColors.map(c => c.position).sort((a, b) => a - b);
    let newPosition = 50;

    if (positions.length >= 2) {
      // Find the largest gap between positions
      let maxGap = 0;
      let gapPosition = 50;

      for (let i = 0; i < positions.length - 1; i++) {
        const gap = positions[i + 1] - positions[i];
        if (gap > maxGap) {
          maxGap = gap;
          gapPosition = positions[i] + gap / 2;
        }
      }

      newPosition = Math.round(gapPosition);
    }

    // Add new color
    const newColors = [
      ...gradientColors,
      { color: '#ffffff', position: newPosition }
    ];

    setGradientColors(newColors);

    // Generate and apply the gradient string directly
    const updatedGradientString = generateGradientString(gradientAngle, newColors);
    onChange?.(updatedGradientString);
  };

  // Remove a color from gradient
  const removeGradientColor = (index: number) => {
    if (gradientColors.length <= 2) return; // Minimum 2 colors

    // Create a new array without the removed color
    const newColors = gradientColors.filter((_, i) => i !== index);

    // Update state with the new colors
    setGradientColors(newColors);

    // Generate and apply the gradient string directly
    const updatedGradientString = generateGradientString(gradientAngle, newColors);
    onChange?.(updatedGradientString);
  };

  // Update the gradient when angle or colors change
  const updateGradient = (angle: number, colors: GradientColor[]) => {
    const gradientString = generateGradientString(angle, colors);
    onChange?.(gradientString);
  };

  return (
    <Flex vertical gap={12}>
      <Flex gap={8} align="center">
        <span>Angle: </span>
        <Radio.Group
          value={gradientAngle}
          onChange={(e) => {
            const newAngle = e.target.value;
            setGradientAngle(newAngle);

            // Generate and apply the gradient string directly
            updateGradient(newAngle, gradientColors);
          }}
          buttonStyle="solid"
          size="small"
        >
          <Radio.Button value={0}>0°</Radio.Button>
          <Radio.Button value={45}>45°</Radio.Button>
          <Radio.Button value={90}>90°</Radio.Button>
          <Radio.Button value={135}>135°</Radio.Button>
          <Radio.Button value={180}>180°</Radio.Button>
        </Radio.Group>
      </Flex>

      <Flex vertical gap={8}>
        <Flex justify="space-between" align="center">
          <Typography.Text>Gradient Colors</Typography.Text>
          <Button
            type="text"
            icon={<LuPlus />}
            size="small"
            onClick={addGradientColor}
            disabled={gradientColors.length >= 4}
          >
            Add Color
          </Button>
        </Flex>

        {gradientColors.map((item, index) => (
          <Flex key={index} gap={8} align="center">
            <ColorPicker
              value={item.color}
              onChange={(color) => {
                const newColors = [...gradientColors];
                newColors[index].color = color.toHexString();
                setGradientColors(newColors);

                // Generate and apply the gradient string directly
                updateGradient(gradientAngle, newColors);
              }}
            />
            <span style={{ minWidth: 40 }}>{item.position}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={item.position}
              style={{ flex: 1 }}
              onChange={(e) => {
                const newColors = [...gradientColors];
                newColors[index].position = parseInt(e.target.value, 10);
                setGradientColors(newColors);

                // Generate and apply the gradient string directly
                updateGradient(gradientAngle, newColors);
              }}
            />
            {gradientColors.length > 2 && (
              <Button
                aria-label={`Remove gradient colour ${index + 1}`}
                type="text"
                icon={<LuMinus />}
                size="small"
                onClick={() => removeGradientColor(index)}
              />
            )}
          </Flex>
        ))}
      </Flex>

      <div
        style={{
          height: 40,
          borderRadius: 4,
          background: generateGradientString(gradientAngle, gradientColors),
          marginTop: 8
        }}
      />

      <Button
        type='link'
        style={{ alignSelf: "flex-end" }}
        onClick={onOpenColorPresets}
      >
        Explore Colors...
      </Button>
    </Flex>
  );
}
