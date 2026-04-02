import { AIEnhancementPack, Currency } from '@data/common';
import { formatCurrency } from '@util/formatters';
import { Button, Card, Flex, Typography, theme } from 'antd';
import React from 'react';
import { FaCoins } from 'react-icons/fa';
import { GiTwoCoins } from 'react-icons/gi';
import { RiCoinFill } from 'react-icons/ri';

const { Text, Title } = Typography;

type CreditPackCardProps = {
    pack: AIEnhancementPack;
    currency: Currency;
    handleCreditsPurchase: (packId: string) => void;
};

const CreditPackCard: React.FC<CreditPackCardProps> = ({ pack, currency, handleCreditsPurchase }) => {
    const { token } = theme.useToken();

    const price = pack[`price${currency}`].price;

    const planStyles: {
        [key: string]: {
            icon: any;
            color: string;
            buttonStyles: React.CSSProperties;
        }
    } = {
        enhancement: {
            icon: GiTwoCoins,
            color: '#1677FF',
            buttonStyles: {
                borderColor: 'rgb(22, 119, 255, 0.3)',
                backgroundImage: 'linear-gradient(to bottom, rgba(22, 119, 255, 0.1), transparent)',
            },
        },
        starter: {
            icon: RiCoinFill,
            color: '#722ED1',
            buttonStyles: {
                borderColor: 'rgb(126, 34, 206, 0.3)',
                backgroundImage: 'linear-gradient(to bottom, rgba(168, 85, 247, 0.1), transparent)',
            }
        },
        value: {
            icon: GiTwoCoins,
            color: '#52C41A',
            buttonStyles: {
                borderColor: 'rgb(82, 196, 26, 0.3)',
                backgroundImage: 'linear-gradient(to bottom, rgba(82, 196, 26, 0.1), transparent)',
            },
        },
        pro: {
            icon: FaCoins,
            color: '#FAAD14',
            buttonStyles: {
                borderColor: 'rgb(250, 173, 20, 0.3)',
                backgroundImage: 'linear-gradient(to bottom, rgba(250, 173, 20, 0.1), transparent)',
            },
        },
    };

    const currentStyle = planStyles[pack.packId as keyof typeof planStyles];

    return (
        <Card
            variant='outlined'
            onClick={() => handleCreditsPurchase(pack.packId)}
            hoverable
            style={{
                // borderColor: currentStyle.buttonStyles.borderColor,
                borderRadius: '16px',
                textAlign: 'center',
                padding: '0',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingLeft: 0,
                minWidth: 250
            }}
            styles={{
                body: {
                    padding: '30px',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%',
                    width: '100%',
                    minWidth: 250,
                },
            }}
        >
            <div>
                <span style={{
                    width: '100%',
                    zIndex: 1,
                    position: 'absolute',
                    top: 0,
                    left: -20,
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    opacity: 0.1,
                    color: currentStyle.color,
                }}>
                    <currentStyle.icon style={{ fontSize: 100 }} />
                </span>
                <Title level={4}>{pack.name}</Title>
                <Flex vertical align='center' justify='center'>
                    <Text strong style={{ fontSize: 24, color: currentStyle.color }}>{pack.name}</Text>
                    <Text type="secondary">{pack.description || 'One-time purchase. No expiry.'}</Text>
                </Flex>
                <Title level={3} style={{ margin: '12px 0' }}>
                    {price !== null ? formatCurrency(price, currency) : 'N/A'}
                </Title>
            </div>
            <Button
                shape='round'
                size="large"
                block
                style={{
                    ...currentStyle.buttonStyles,
                    color: currentStyle.color,
                    marginTop: 40,
                }}
                icon={<currentStyle.icon />}
            >
                Purchase
            </Button>
        </Card>
    );
};

export default CreditPackCard;
