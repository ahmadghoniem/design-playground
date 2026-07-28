import type { ComponentType } from "react"
import type { ComponentSize } from "@pg/shared/lib/constants"

export type { ComponentSize } from "@pg/shared/lib/constants"

export interface RegistryLeafItem {
  id: string
  label: string
  Component: ComponentType<Record<string, unknown>>
  props?: Record<string, unknown>
  getProps?: () => Promise<Record<string, unknown>> | Record<string, unknown>
  parentId?: string
  sourcePath: string
  childComponents?: string[]
  size?: ComponentSize
}
