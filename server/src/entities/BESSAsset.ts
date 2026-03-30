import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Alert } from "./Alert";
import { AssetTechnicianAssignment } from "./AssetTechnicianAssignment";
import { MaintenanceLog } from "./MaintenanceLog";
import { User } from "./User";

export enum AssetCategory {
  GRID_SCALE = "GRID_SCALE",
  COMMERCIAL = "COMMERCIAL",
  RESIDENTIAL = "RESIDENTIAL",
}

export enum AssetStatus {
  ACTIVE = "ACTIVE",
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
  OFFLINE = "OFFLINE",
  DECOMMISSIONED = "DECOMMISSIONED",
}

@Entity("bess_assets")
export class BESSAsset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 140 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar", length: 180 })
  siteName!: string;

  @Column({ type: "simple-enum", enum: AssetCategory })
  category!: AssetCategory;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  capacityKwh!: number;

  @Index()
  @Column({ type: "simple-enum", enum: AssetStatus, default: AssetStatus.ACTIVE })
  status!: AssetStatus;

  @Column({ type: "datetime", nullable: true })
  installationDate!: Date | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  imageUrl!: string | null;

  @Index()
  @ManyToOne(() => User, (user) => user.ownedAssets, { nullable: false, onDelete: "CASCADE" })
  owner!: User;

  @OneToMany(() => MaintenanceLog, (log) => log.asset)
  maintenanceLogs!: MaintenanceLog[];

  @OneToMany(() => Alert, (alert) => alert.asset)
  alerts!: Alert[];

  @OneToMany(() => AssetTechnicianAssignment, (assignment) => assignment.asset)
  assignments!: AssetTechnicianAssignment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
