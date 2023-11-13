import { Replace } from "src/type/index.type";
import { Entity, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { Artwork, ArtworkRes } from "../artwork/artwork.entity";
import { Consulting, ConsultingRes } from "../consulting/consulting.entity";
import { Note, NoteRes } from "../note/note.entity";

import { Notification } from "./notification.entity";

@Entity({ name: 'notification_relations' })
export class NotificationRelation {
  @PrimaryColumn({ name: 'notification_id', type: 'bigint' })
  notificationId: bigint;

  @OneToOne(() => Notification, entity => entity.relation)
  @JoinColumn({name: 'notification_id'})
  notification?: Notification;

  @ManyToOne(() => Note)
  @JoinColumn({name: 'note_id'})
  note?: Note;



  @ManyToOne(() => Artwork)
  @JoinColumn({name: 'artwork_id'})
  artwork?: Artwork;

  @ManyToOne(() => Consulting)
  @JoinColumn({name: 'consulting_id'})
  consulting?: Consulting;


}

export type NotificationRelationDto = Partial<NotificationRelation>;

export class NotificationRelationRes {
  note?: NoteRes;

  artwork?: ArtworkRes;
  consulting?: ConsultingRes;

  constructor({
    note, artwork, consulting
  }: NotificationRelation) {
    if(note) {
      this.note = new NoteRes(note);
    }
    
    if(artwork) {
      this.artwork = new ArtworkRes(artwork);
    }
    if(consulting) {
      this.consulting = new ConsultingRes(consulting);
    }
  
  }
}

export type NotificationRelationReq = Partial<
  Replace<NotificationRelationRes, {
    note: string;
    artwork: string;
    consulting: string;
  }>
>;
