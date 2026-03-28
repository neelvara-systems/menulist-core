import { Dispatch, SetStateAction } from "react"

export type PreviewContextType = {
    darkMode: boolean,
    deviceType: string,
    fromPage: string,
    reloadInProgress: boolean
}
export type PreviewBuilderContextType = { data: PreviewContextType, updater: Dispatch<SetStateAction<PreviewBuilderContextType>> }
