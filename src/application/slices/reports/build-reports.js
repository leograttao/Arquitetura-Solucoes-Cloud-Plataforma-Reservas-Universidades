export function makeReportUseCases({
  identity,
  reservations,
  waitlist,
  catalog,
  clock = () => new Date()
}) {
  const summarize = async (university) => {
    const [bookingItems, waitingItems, roomItems, students] = await Promise.all([
      reservations.list(university.id),
      waitlist.list(university.id),
      catalog.listRooms(university.id),
      identity.listStudents(university.id)
    ]);

    const confirmed = bookingItems.filter(
      (item) => item.status === 'confirmed'
    );

    return {
      universityId: university.id,
      universityName: university.name,
      rooms: roomItems.length,
      students: students.length,
      reservations: bookingItems.length,
      confirmedReservations: confirmed.length,
      cancelledReservations: bookingItems.length - confirmed.length,
      studentsWaiting: waitingItems.filter(
        (item) => item.status === 'waiting'
      ).length,
      generatedAt: clock().toISOString()
    };
  };

  return {
    university: async ({ tenantId }) => {
      const university = await identity.findUniversity(tenantId);

      if (!university) {
        throw Object.assign(new Error('Universidade não encontrada.'), {
          statusCode: 404
        });
      }

      return summarize(university);
    },

    platform: async () => {
      const universities = await identity.listUniversities();
      const items = await Promise.all(universities.map(summarize));
      const total = (field) => items.reduce(
        (sum, item) => sum + item[field],
        0
      );

      return {
        generatedAt: clock().toISOString(),
        totals: {
          universities: universities.length,
          pendingUniversities: universities.filter(
            (item) => item.status === 'pending'
          ).length,
          activeUniversities: universities.filter(
            (item) => item.status === 'active'
          ).length,
          students: total('students'),
          rooms: total('rooms'),
          reservations: total('reservations'),
          confirmedReservations: total('confirmedReservations'),
          studentsWaiting: total('studentsWaiting')
        },
        universities: items.map((item) => ({
          ...item,
          status: universities.find(
            (university) => university.id === item.universityId
          )?.status
        }))
      };
    }
  };
}