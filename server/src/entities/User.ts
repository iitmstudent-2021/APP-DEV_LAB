import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Alert } from "./Alert";
import { BESSAsset } from "./BESSAsset";
import { MaintenanceLog } from "./MaintenanceLog";

export enum UserRole {
  ADMIN = "ADMIN",
  ASSET_MANAGER = "ASSET_MANAGER",
  TECHNICIAN = "TECHNICIAN",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120 })
  fullName!: string;

  @Column({ type: "varchar", length: 160, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  passwordHash!: string;

  @Column({ type: "simple-enum", enum: UserRole })
  role!: UserRole;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @OneToMany(() => BESSAsset, (asset) => asset.owner)
  ownedAssets!: BESSAsset[];

  @OneToMany(() => MaintenanceLog, (log) => log.technician)
  maintenanceLogs!: MaintenanceLog[];

  @OneToMany(() => Alert, (alert) => alert.raisedBy)
  raisedAlerts!: Alert[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
