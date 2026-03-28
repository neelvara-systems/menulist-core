import FormElementWrapper from '@atoms/formElementWrapper'
import Saperator from '@atoms/Saperator'
import EditorWrapper from '@organisms/editor/editorWrapper'
import { GlobalAddressType } from '@type/common'
import { UserDataType } from '@type/platform/user'
import { removeObjRef, updateDeepPathValue } from '@util/utils'
import { Button, Empty, Input, Space, Typography } from 'antd'
import { Fragment } from 'react'
import { LuLocate, LuX } from 'react-icons/lu'
const { Text } = Typography;

function Addresses({ userDetails, onChangeValue }) {

    const onClickAddAddress = () => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        if (!userCopy.addresses) userCopy.addresses = [];
        userCopy.addresses.push({
            label: "",
            district: "",
            city: "",
            state: "",
            addressLine: "",
            area: "",
            postalCode: "",
            country: ""
        });
        onChangeValue('addresses', userCopy.addresses)
    }

    const onChangeAddressValue = (index, from, value) => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        userCopy.addresses[index] = updateDeepPathValue(userCopy.addresses[index], from, value);;
        onChangeValue('addresses', userCopy.addresses)
    }

    const onClickRemoveAddress = (index) => {
        const userCopy: UserDataType = removeObjRef(userDetails);
        userCopy.addresses.splice(index, 1);
        onChangeValue('addresses', userCopy.addresses)
    }

    return (
        <EditorWrapper>
            {Boolean(userDetails?.addresses?.length) ?
                <>
                    {userDetails?.addresses?.map((addressDetails: GlobalAddressType, index) => {
                        return <Fragment key={index}>
                            <EditorWrapper>
                                <FormElementWrapper label="Address Type" mandatory>
                                    <Input placeholder="Home/Work/Other" value={addressDetails?.label || ""} onChange={(e) => onChangeAddressValue(index, 'label', e.target.value)} />
                                </FormElementWrapper>

                                <FormElementWrapper label="Address line" mandatory>
                                    <Input placeholder="Address Line" value={addressDetails?.addressLine || ""} onChange={(e) => onChangeAddressValue(index, 'addressLine', e.target.value)} />
                                </FormElementWrapper>

                                <FormElementWrapper label='Area/Landmark' mandatory>
                                    <Input placeholder="Area/Landmark" value={addressDetails?.area || ""} onChange={(e) => onChangeAddressValue(index, 'area', e.target.value)} />
                                </FormElementWrapper>

                                <FormElementWrapper label='District' mandatory>
                                    <Input placeholder="District" value={addressDetails?.district || ""} onChange={(e) => onChangeAddressValue(index, 'district', e.target.value)} />
                                </FormElementWrapper>

                                <FormElementWrapper label='City' mandatory>
                                    <Input placeholder="city" value={addressDetails?.city || ""} onChange={(e) => onChangeAddressValue(index, 'city', e.target.value)} />
                                </FormElementWrapper>

                                <FormElementWrapper label='State' mandatory>
                                    <Input placeholder="state" value={addressDetails?.state || ""} onChange={(e) => onChangeAddressValue(index, 'state', e.target.value)} />
                                </FormElementWrapper>

                                <FormElementWrapper label='Country' mandatory>
                                    <Input placeholder="country" value={addressDetails?.country || ""} onChange={(e) => onChangeAddressValue(index, 'country', e.target.value)} />
                                </FormElementWrapper>

                                <FormElementWrapper label='Postal Code' mandatory>
                                    <Input placeholder="postalCode" value={addressDetails?.postalCode || ""} onChange={(e) => onChangeAddressValue(index, 'postalCode', e.target.value)} />
                                </FormElementWrapper>

                                <Space align="end" style={{ width: "100%", justifyContent: "flex-end" }}>
                                    <Button danger icon={<LuX />} onClick={() => onClickRemoveAddress(index)}>Delete</Button>
                                </Space>
                            </EditorWrapper>
                            <Saperator />
                        </Fragment>
                    })}
                </>
                :
                <Empty description="No addresses found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            }
            <Button icon={<LuLocate />} onClick={onClickAddAddress}>Add New Address</Button>
        </EditorWrapper>
    )
}

export default Addresses