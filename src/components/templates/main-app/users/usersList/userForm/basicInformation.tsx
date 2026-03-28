import FormElementWrapper from '@atoms/formElementWrapper';
import PhoneNumberInput from '@atoms/phoneNumberInput'; // Assuming the new component is imported from here
import EditorWrapper from '@organisms/editor/editorWrapper';
import { Button, Flex, Input, Switch, Typography } from 'antd';
import { LuRefreshCcw, LuUpload } from 'react-icons/lu';
const { Text } = Typography;

const imageStyles = {
    width: "auto",
    height: 100,
    borderRadius: "50%"
}

function BasicInformation({ userDetails, selectedProfileImage, onChangeValue, fileInputRef }) {

    const renderImage = (src) => {
        return <>
            <img src={src} style={imageStyles} />
            <Button type='text' icon={<LuRefreshCcw />} >Replace</Button>
        </>
    }

    return (
        <EditorWrapper gap={20}>
            <EditorWrapper>
                <Flex onClick={() => fileInputRef.current.click()} align="center" justify="center" gap={10}>
                    {selectedProfileImage.src ? renderImage(selectedProfileImage.src) : <>
                        {userDetails?.profileImage ? renderImage(userDetails?.profileImage) : <>
                            <Button style={{ height: 100 }} block icon={<LuUpload />}>Upload Profile Image</Button>
                        </>}
                    </>}
                </Flex>
            </EditorWrapper>

            <FormElementWrapper label="Active" >
                <Switch size="small"
                    defaultChecked={userDetails?.active || false}
                    value={userDetails?.active || false}
                    onChange={() => onChangeValue('active', !Boolean(userDetails?.active))}
                />
            </FormElementWrapper>

            <FormElementWrapper label="Name" mandatory>
                <Input placeholder="Name" value={userDetails?.name || ""} onChange={(e) => onChangeValue('name', e.target.value)} />
            </FormElementWrapper>

            <FormElementWrapper label='Email' mandatory>
                <Input type='email' placeholder="Email" value={userDetails?.email || ""} onChange={(e) => onChangeValue('email', e.target.value)} />
            </FormElementWrapper>

            <FormElementWrapper label='Phone Number' mandatory>
                <PhoneNumberInput
                    countryCode={userDetails?.countryCode || ''}
                    phoneNumber={userDetails?.phoneNumber || ''}
                    dialCode={userDetails?.dialCode || ''}
                    onChange={(data) => onChangeValue('phoneNumber', data)}
                />
            </FormElementWrapper>

            <FormElementWrapper label='Alternate Number'>
                <PhoneNumberInput
                    countryCode={userDetails?.alternatePhoneNumber?.countryCode || ''}
                    phoneNumber={userDetails?.alternatePhoneNumber?.phoneNumber || ''}
                    dialCode={userDetails?.alternatePhoneNumber?.dialCode || ''}
                    onChange={(data) => onChangeValue('alternatePhoneNumber', data)}
                />
            </FormElementWrapper>

        </EditorWrapper>
    )
}

export default BasicInformation