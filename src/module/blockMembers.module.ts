import { Module } from "@nestjs/common";
import { BlockMembersController } from "src/controller/blockMembers.controller";
import { BlockMembersService } from "src/service/blockMembers.service";

@Module({
  imports: [],
  providers: [BlockMembersService],
  controllers: [BlockMembersController]
})
export class BlockMembersModule {}