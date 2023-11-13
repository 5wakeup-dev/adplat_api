import { Manager } from "../member/manager.entity"
import { User } from "../member/user.entity"

export type AuthOption = {
  auth?: Manager | User,
  force?: boolean
};