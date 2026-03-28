import FormElementWrapper from '@atoms/formElementWrapper';
import EditorWrapper from '@organisms/editor/editorWrapper';
import { UserDataType } from '@type/platform/user';
import { getUTCDate } from '@util/dateTime';
import { DatePicker, Flex, Input, Select, Tag, Typography } from 'antd';
import { useState } from 'react';
const { Text } = Typography;

function AdditionalInfo({ userDetails, onChangeValue }: { userDetails: UserDataType, onChangeValue: any }) {

    const [skillValue, setSkillValue] = useState('')

    const onAddSkill = () => {
        const skill = skillValue.trim()
        if (Boolean(skill)) {
            setSkillValue('')
            onChangeValue('skills', (`${userDetails?.skills?.length ? `${userDetails?.skills},` : ""}${skill}`))
        }
    }

    const onClickSkill = (skill) => {
        const skills = userDetails?.skills?.split(',') || [];
        let index = skills?.findIndex((s) => skill == s);
        if (index != -1) {
            skills?.splice(index, 1)
            onChangeValue('skills', skills?.join(","))
        }
    }

    return (
        <EditorWrapper>
            <FormElementWrapper label="Gender">
                <Select
                    defaultValue={userDetails?.gender || ""}
                    value={userDetails?.gender || ""}
                    style={{ width: "100%" }}
                    placeholder="Select Gender"
                    onChange={(value) => onChangeValue('gender', value)}
                    options={[
                        { label: 'Male', value: 'male' },
                        { label: 'Female', value: 'female' },
                        { label: 'Other', value: 'other' },
                    ]}
                />
            </FormElementWrapper>
            <FormElementWrapper label="Birth Date">
                <DatePicker defaultValue={userDetails?.birthday ? userDetails?.birthday : undefined} onChange={(date, dateString) => onChangeValue('birthday', getUTCDate(date["$d"]).dateString)} />
            </FormElementWrapper>
            <FormElementWrapper label='Notes'>
                <Input.TextArea placeholder="Additional Notes" value={userDetails?.notes || ""} onChange={(e) => onChangeValue('notes', e.target.value)} />
            </FormElementWrapper>
            <FormElementWrapper label="Skills">
                <Flex vertical gap={5}>
                    {Boolean(userDetails?.skills) && <Flex gap={5} wrap="wrap">
                        {userDetails?.skills.split(",").map((skill) => {
                            return <Tag onClick={() => onClickSkill(skill)} style={{ fontSize: 14, lineHeight: 2 }} key={skill} >{skill}</Tag>
                        })}
                    </Flex>}
                    <Input.Search onPressEnter={onAddSkill} onSearch={onAddSkill} value={skillValue} onChange={(e) => setSkillValue(e.target.value)} enterButton="Add Skill" />
                </Flex>
            </FormElementWrapper>
        </EditorWrapper>
    )
}

export default AdditionalInfo