import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { BESSAsset } from "./BESSAsset";
import { User } from "./User";

export enum AlertSeverity {
  CRITICAL = "CRITICAL",
  WARNING = "WARNING",
  INFO = "INFO",
}

export enum AlertStatus {
  OPEN = "OPEN",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  RESOLVED = "RESOLVED",
}

@Entity("alerts")
export class Alert {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 140 })
  title!: string;

  @Index()
  @Column({ type: "simple-enum", enum: AlertSeverity })
  severity!: AlertSeverity;

  @Index()
  @Column({ type: "simple-enum", enum: AlertStatus, default: AlertStatus.OPEN })
  status!: AlertStatus;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "timestamp" })
  raisedAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  resolvedAt!: Date | null;

  @ManyToOne(() => User, (user) => user.raisedAlerts, { nullable: false, onDelete: "CASCADE" })
  raisedBy!: User;

  @ManyToOne(() => BESSAsset, (asset) => asset.alerts, { nullable: false, onDelete: "CASCADE" })
  asset!: BESSAsset;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
