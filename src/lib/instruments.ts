import { Drum, Guitar, MicVocal, Music, Piano } from "lucide-react";

export const instruments = [
  { id: "guitarra", name: "Guitarra", icon: Guitar },
  { id: "piano", name: "Piano", icon: Piano },
  { id: "bateria", name: "Batería", icon: Drum },
  { id: "voz", name: "Voz", icon: MicVocal },
  { id: "bajo", name: "Bajo", icon: Guitar },
  { id: "violin", name: "Violín", icon: Music },
  { id: "ukelele", name: "Ukelele", icon: Guitar },
  { id: "saxofon", name: "Saxofón", icon: Music },
  { id: "flauta", name: "Flauta", icon: Music },
] as const;

export type InstrumentId = (typeof instruments)[number]["id"];

export function instrumento(id: string) {
  return instruments.find((item) => item.id === id) ?? { id, name: id, icon: Music };
}
