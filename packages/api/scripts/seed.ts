import "dotenv/config";
import bcrypt from "bcryptjs";
import { computePlayerLevel, type SkillSurvey } from "@padel-ve/shared";
import { initSchema, selectOne } from "../src/db";
import { Bookings, Clubs, Courts, MatchPlayers, Matches, Sponsorships, Tournaments, Users } from "../src/repositories";

async function main() {
  await initSchema();

  const passwordHash = await bcrypt.hash("padel123", 10);

  async function upsertUser(email: string, data: { name: string; role: string; city: string; survey: SkillSurvey }) {
    const existing = await Users.findByEmail(email);
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

  const admin = await upsertUser("admin@padelve.com", {
    name: "Admin Padel WP",
    role: "PLATFORM_ADMIN",
    city: "Caracas",
    survey: { dominantArm: "DERECHA", frequency: "SEMANAL", yearsPlaying: 2, selfAssessment: 3, competes: false },
  });
  const clubOwner = await upsertUser("club@lasmercedespadel.com", {
    name: "Carlos Padel Club",
    role: "CLUB_ADMIN",
    city: "Caracas",
    survey: { dominantArm: "DERECHA", frequency: "VARIAS_VECES_SEMANA", yearsPlaying: 8, selfAssessment: 4, competes: true },
  });
  const player1 = await upsertUser("maria@example.com", {
    name: "María Rodríguez",
    role: "PLAYER",
    city: "Caracas",
    survey: { dominantArm: "DERECHA", frequency: "VARIAS_VECES_SEMANA", yearsPlaying: 4, selfAssessment: 4, competes: true },
  });
  const player2 = await upsertUser("jose@example.com", {
    name: "José Pérez",
    role: "PLAYER",
    city: "Caracas",
    survey: { dominantArm: "IZQUIERDA", frequency: "SEMANAL", yearsPlaying: 1.5, selfAssessment: 3, competes: false },
  });

  let club = await selectOne<any>("clubs", { name: "Las Mercedes Pádel Club" });
  if (!club) {
    club = await Clubs.create({
      ownerId: clubOwner.id,
      name: "Las Mercedes Pádel Club",
      description: "Club de pádel en el este de Caracas, 4 pistas panorámicas.",
      address: "Av. Principal de Las Mercedes",
      city: "Caracas",
    });
    await Clubs.updateVisibilityPlan(club.id, "FEATURED");
  }

  let court = (await Courts.listByClub(club.id))[0];
  if (!court) {
    court = await Courts.create({
      clubId: club.id,
      name: "Pista 1",
      type: "PANORAMICA",
      indoor: false,
      lighting: true,
      pricePerHourUsd: 25,
    });
    await Courts.create({
      clubId: club.id,
      name: "Pista 2 (techada)",
      type: "CRISTAL",
      indoor: true,
      lighting: true,
      pricePerHourUsd: 28,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  let booking = await Bookings.findByCourtDateStart(court.id, today, "18:00");
  if (!booking) {
    booking = await Bookings.create({ courtId: court.id, date: today, startTime: "18:00", endTime: "19:00", userId: player1.id });
  }

  const existingMatch = await Matches.findByBookingId(booking.id);
  if (!existingMatch) {
    const match = await Matches.create({ bookingId: booking.id, creatorId: player1.id, type: "OPEN", levelMin: 2, levelMax: 4 });
    await MatchPlayers.create({ matchId: match.id, userId: player1.id, team: 1 });
    await MatchPlayers.create({ matchId: match.id, userId: player2.id, team: 1 });
  }

  const existingSponsorship = await selectOne<any>("sponsorships", { sponsorName: "Cerveza Solera" });
  if (!existingSponsorship) {
    const sponsorship = await Sponsorships.create({
      sponsorName: "Cerveza Solera",
      planName: "Banner destacado - 1 mes",
      clubId: club.id,
      bannerUrl: "https://placehold.co/728x90?text=Solera+Padel",
      linkUrl: "https://example.com",
    });
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    await Sponsorships.activate(sponsorship.id, endDate.toISOString());
  }

  const existingTournament = await selectOne<any>("tournaments", { name: "Copa Padel WP Caracas" });
  if (!existingTournament) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 14);
    await Tournaments.create({
      createdBy: admin.id,
      clubId: club.id,
      name: "Copa Padel WP Caracas",
      description: "Torneo abierto por categorías en Las Mercedes Pádel Club.",
      city: "Caracas",
      levelMin: 1,
      levelMax: 5,
      startDate: startDate.toISOString().slice(0, 10),
      maxPlayers: 16,
    });
  }

  console.log("Seed completado. Usuarios de prueba (password: padel123):");
  console.log(`  Admin:   ${admin.email} (nivel ${admin.level})`);
  console.log(`  Club:    ${clubOwner.email} (nivel ${clubOwner.level})`);
  console.log(`  Jugador: ${player1.email} (nivel ${player1.level})`);
  console.log(`  Jugador: ${player2.email} (nivel ${player2.level})`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
