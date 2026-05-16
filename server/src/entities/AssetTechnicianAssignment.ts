import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { BESSAsset } from "./BESSAsset";
import { User } from "./User";

@Entity("asset_technician_assignments")
@Unique(["asset", "technician"])
export class AssetTechnicianAssignment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => BESSAsset, (asset) => asset.assignments, { nullable: false, onDelete: "CASCADE" })
  asset!: BESSAsset;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  technician!: User;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  assignedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
