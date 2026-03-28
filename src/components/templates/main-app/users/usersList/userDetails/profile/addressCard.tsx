import TextElement from '@antdComponent/textElement';
import { Card, Flex } from 'antd';
import { LuBuilding, LuHome, LuMapPin } from 'react-icons/lu';

interface AddressType {
  label: 'home' | 'office' | 'other';
  addressLine: string;
  area: string;
  district: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

const getLabelIcon = (label: AddressType['label']) => {
  switch (label) {
    case 'home':
      return <LuHome />;
    case 'office':
      return <LuBuilding />;
    default:
      return <LuMapPin />;
  }
};

const getLabelColor = (label: AddressType['label']) => {
  switch (label) {
    case 'home':
      return 'blue';
    case 'office':
      return 'green';
    default:
      return 'default';
  }
};

function AddressCard({ address }: { address: AddressType }) {
  const fullAddress = [
    address.addressLine,
    address.area,
    address.district,
    address.city,
    address.state,
    address.country,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card size="small" style={{ width: '100%' }}>
      <Flex vertical gap={12} style={{ width: '100%' }}>
        <Flex justify="space-between" align="center">
          <TextElement
            text={address.label.charAt(0).toUpperCase() + address.label.slice(1)}
            icon={getLabelIcon(address.label)}
          />
          {/* <Tag color={getLabelColor(address.label)}>{address.label.toUpperCase()}</Tag> */}
        </Flex>
        <TextElement text={fullAddress} type="secondary" />
      </Flex>
    </Card>
  );
}

export default AddressCard;
