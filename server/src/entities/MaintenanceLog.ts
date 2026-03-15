import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BESSAsset } from "./BESSAsset";
import { User } from "./User";

export enum MaintenanceLogType {
  ROUTINE = "ROUTINE",
  EMERGENCY = "EMERGENCY",
  INSPECTION = "INSPECTION",
  REPAIR = "REPAIR",
}

@Entity("maintenance_logs")
export class MaintenanceLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "simple-enum", enum: MaintenanceLogType })
  logType!: MaintenanceLogType;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  stateOfHealthPercent!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  temperatureCelsius!: number | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "datetime" })
  visitedAt!: Date;

  @ManyToOne(() => User, (user) => user.maintenanceLogs, { nullable: false, onDelete: "CASCADE" })
  technician!: User;

  @ManyToOne(() => BESSAsset, (asset) => asset.maintenanceLogs, { nullable: false, onDelete: "CASCADE" })
  asset!: BESSAsset;

  @CreateDateColumn()
  createdAt!: Date;
}
