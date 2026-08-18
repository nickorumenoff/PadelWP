import "dotenv/config";
import bcrypt from "bcryptjs";
import { computePlayerLevel, type SkillSurvey } from "@padel-ve/shared";
import { db } from "../src/db";
import { Bookings, Clubs, Courts, MatchPlayers, Matches, Sponsorships, Users } from "../src/repositories";

async function main() {
  const passwordHash = await bcrypt.hash("padel123", 10);

  function upsertUser(
    email: string,
    data: { name: string; role: string; city: string; survey: SkillSurvey }
  ) {
    const existing = Users.findByEmail(email);
    if (existing) return existing;
    const level = computePlayerLevel(data.survey);
    return Users.create({
      name: data.name,
      email,
      passwordHash,
      role: data.role,
      city: data.city,
      level,
      ...data.survey,
    });
  }

  const admin = upsertUser("admin@padelve.com", {
    name: "Admin Padel WP",
    role: "PLATFORM_ADMIN",
    city: "Caracas",
    survey: { dominantArm: "DERECHA", frequency: "SEMANAL", yearsPlaying: 2, selfAssessment: 3, competes: false },
  });
  const clubOwner = upsertUser("club@lasmercedespadel.com", {
    name: "Carlos Padel Club",
    role: "CLUB_ADMIN",
    city: "Caracas",
    survey: { dominantArm: "DERECHA", frequency: "VARIAS_VECES_SEMANA", yearsPlaying: 8, selfAssessment: 4, competes: true },
  });
  const player1 = upsertUser("maria@example.com", {
    name: "María Rodríguez",
    role: "PLAYER",
    city: "Caracas",
    survey: { dominantArm: "DERECHA", frequency: "VARIAS_VECES_SEMANA", yearsPlaying: 4, selfAssessment: 4, competes: true },
  });
  const player2 = upsertUser("jose@example.com", {
    name: "José Pérez",
    role: "PLAYER",
    city: "Caracas",
    survey: { dominantArm: "IZQUIERDA", frequency: "SEMANAL", yearsPlaying: 1.5, selfAssessment: 3, competes: false },
  });

  let club = db.prepare(`SELECT * FROM clubs WHERE name = ?`).get("Las Mercedes Pádel Club") as any;
  if (!club) {
    club = Clubs.create({
      ownerId: clubOwner.id,
      name: "Las Mercedes Pádel Club",
      description: "Club de pádel en el este de Caracas, 4 pistas panorámicas.",
      address: "Av. Principal de Las Mercedes",
      city: "Caracas",
    });
    Clubs.updateVisibilityPlan(club.id, "FEATURED");
  }

  let court = Courts.listByClub(club.id)[0];
  if (!court) {
    court = Courts.create({ clubId: club.id, name: "Pista 1", type: "PANORAMICA", indoor: false, pricePerHourUsd: 25 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let booking = Bookings.findByCourtDateStart(court.id, today, "18:00");
  if (!booking) {
    booking = Bookings.create({ courtId: court.id, date: today, startTime: "18:00", endTime: "19:00", userId: player1.id });
  }

  const existingMatch = Matches.findByBookingId(booking.id);
  if (!existingMatch) {
    const match = Matches.create({ bookingId: booking.id, creatorId: player1.id, type: "OPEN", levelMin: 2, levelMax: 4 });
    MatchPlayers.create({ matchId: match.id, userId: player1.id, team: 1 });
    MatchPlayers.create({ matchId: match.id, userId: player2.id, team: 1 });
  }

  const existingSponsorship = db.prepare(`SELECT * FROM sponsorships WHERE sponsorName = ?`).get("Cerveza Solera");
  if (!existingSponsorship) {
    const sponsorship = Sponsorships.create({
      sponsorName: "Cerveza Solera",
      planName: "Banner destacado - 1 mes",
      clubId: club.id,
      bannerUrl: "https://placehold.co/728x90?text=Solera+Padel",
      linkUrl: "https://example.com",
    });
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    Sponsorships.activate(sponsorship.id, endDate.toISOString());
  }

  console.log("Seed completado. Usuarios de prueba (password: padel123):");
  console.log(`  Admin:   ${admin.email} (nivel ${admin.level})`);
  console.log(`  Club:    ${clubOwner.email} (nivel ${clubOwner.level})`);
  console.log(`  Jugador: ${player1.email} (nivel ${player1.level})`);
  console.log(`  Jugador: ${player2.email} (nivel ${player2.level})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
