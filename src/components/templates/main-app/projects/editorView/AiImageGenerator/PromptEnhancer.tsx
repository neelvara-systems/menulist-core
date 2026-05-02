import React, { useState } from 'react';
import { Button, Flex, Input, Modal, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { LuBadgeInfo, LuWand2, LuPlus } from 'react-icons/lu';

interface PromptEnhancerProps {
  prompt: string;
  onEnhancedPromptSelect: (enhancedPrompt: string) => void;
}

const PromptEnhancer: React.FC<PromptEnhancerProps> = ({
  prompt,
  onEnhancedPromptSelect
}) => {
  const { token } = theme.useToken();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [enhancedPrompts, setEnhancedPrompts] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([
    'photorealistic', 'high detail', 'professional lighting', 'studio quality', 
    'high resolution', 'sharp focus', 'commercial photography', 'vibrant colors',
    'cinematic', 'dramatic lighting', '8k', 'ultra detailed'
  ]);
  const [newTag, setNewTag] = useState('');

  const generateEnhancedPrompts = async () => {
    if (!prompt) return;
    
    setIsLoading(true);
    
    // In a real implementation, this would call an API to generate enhanced prompts
    // For now, we'll simulate it with some example enhancements
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const enhanced = [
      `${prompt}, photorealistic, high detail, professional lighting`,
      `${prompt}, studio quality, commercial photography, sharp focus`,
      `${prompt}, high resolution, professional product photography`
    ];
    
    setEnhancedPrompts(enhanced);
    setIsLoading(false);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    generateEnhancedPrompts();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSelectPrompt = (enhancedPrompt: string) => {
    onEnhancedPromptSelect(enhancedPrompt);
    handleCloseModal();
  };

  const handleAddTag = () => {
    if (newTag && !customTags.includes(newTag)) {
      setCustomTags([...customTags, newTag]);
      setNewTag('');
    }
  };

  const handleAddTagToPrompt = (tag: string) => {
    onEnhancedPromptSelect(`${prompt}, ${tag}`);
  };

  return (
    <>
      <Button 
        type="text" 
        icon={<LuWand2 />} 
        onClick={handleOpenModal}
        disabled={!prompt}
        title="Improve your prompt with ready-made suggestions"
      >
        Enhance
      </Button>

      <Modal
        title={
          <Flex align="center" gap={8}>
            <LuWand2 />
            <span>Prompt Enhancement</span>
          </Flex>
        }
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
      >
        <Flex vertical gap={16} style={{ marginTop: 16 }}>
          <div>
            <Typography.Text strong>Original Prompt:</Typography.Text>
            <Typography.Paragraph style={{ marginTop: 8 }}>{prompt}</Typography.Paragraph>
          </div>

          <Flex vertical gap={8}>
            <Typography.Text strong>Enhanced Prompts:</Typography.Text>
            {isLoading ? (
              <Typography.Text type="secondary">Generating enhanced prompts...</Typography.Text>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {enhancedPrompts.map((enhancedPrompt, index) => (
                  <Button
                    key={index}
                    style={{ textAlign: 'left', height: 'auto', padding: '8px 12px' }}
                    onClick={() => handleSelectPrompt(enhancedPrompt)}
                    block
                  >
                    {enhancedPrompt}
                  </Button>
                ))}
              </Space>
            )}
          </Flex>

          <Flex vertical gap={8}>
            <Flex align="center" gap={4}>
              <Typography.Text strong>Quality Enhancers:</Typography.Text>
              <Tooltip title="These quality descriptors enhance image clarity and detail, and work alongside your selected artistic styles">
                <LuBadgeInfo style={{ color: token.colorTextSecondary, cursor: 'pointer' }} />
              </Tooltip>
            </Flex>
            <Typography.Text type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
              Click any tag to add it to your prompt. These work with any artistic style.
            </Typography.Text>
            <Flex gap={8} wrap="wrap">
              {customTags.map((tag, index) => (
                <Tag
                  key={index}
                  color="blue"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleAddTagToPrompt(tag)}
                >
                  {tag}
                </Tag>
              ))}
              <Flex align="center" gap={8}>
                <Input
                  placeholder="Add custom tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onPressEnter={handleAddTag}
                  style={{ width: 150 }}
                />
                <Button 
                  type="primary" 
                  icon={<LuPlus />} 
                  onClick={handleAddTag}
                  disabled={!newTag}
                >
                  Add
                </Button>
              </Flex>
            </Flex>
          </Flex>

          <Flex align="center" gap={4} style={{ marginTop: 8 }}>
            <LuBadgeInfo style={{ color: token.colorTextSecondary }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Adding specific details to your prompt can significantly improve the quality of generated images.
            </Typography.Text>
          </Flex>
        </Flex>
      </Modal>
    </>
  );
};

export default PromptEnhancer;
