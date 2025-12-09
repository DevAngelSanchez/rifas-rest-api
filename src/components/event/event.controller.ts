import { Request, Response } from "express";
import { prisma } from "../../utils/const"
import { TicketStatus } from "../../generated/prisma/enums";

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, type, description, date, location } = req.body;
    const organizerId = req.user!.id;

    const newEvent = await prisma.event.create({
      data: {
        title,
        type,
        description,
        date: new Date(date),
        location,
        organizerId
      },
    });

    res.status(201).json({ message: "Evento creado exitosamente", event: newEvent });

  } catch (error) {
    console.error("Error al crear el evento. ", error);
    return res.status(500).json("Error al crear el evento. Algo salio mal en el servidor.");
  }
}

export const getEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany();

    res.status(200).json(events);
  } catch (error) {
    console.error("Error al obtener los eventos. ", error);
    return res.status(500).json("Error al obtener los eventos. Algo salio mal en el servidor.");
  }
}

export const getEventById = async (req: Request, res: Response) => {
  try {

    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json("Evento no encontrado.");
    }

    res.status(200).json(event);

  } catch (error) {
    console.error("Error al obtener el evento.", error);
    return res.status(500).json("Error al obtener el evento. Algo salio mal en el servidor.");
  }
}

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, type, description, date, location } = req.body;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        type,
        description,
        date: new Date(date),
        location
      },
    });

    res.status(200).json({ message: "Evento actualizado exitosamente", event: updatedEvent });
  } catch (error) {
    console.error("Error al actualizar el evento. ", error);
    return res.status(500).json("Error al actualizar el evento. Algo salio mal en el servidor.");
  }
}

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json("El ID del evento es requerido.");
    }

    await prisma.event.delete({
      where: { id }
    });

    return res.status(200).json({ message: "Evento eliminado exitosamente." });


  } catch (error) {
    console.error("Error al eliminar el evento. ", error);
    return res.status(500).json("Error al eliminar el evento. Algo salio mal en el servidor");
  }
}

export const createEventTicketType = async (req: Request, res: Response) => {
  try {

    const { name, price, eventId } = req.body;

    const newEventTicketType = await prisma.eventTicketType.create({
      data: {
        name,
        price,
        eventId
      }
    });

    return res.status(201).json({ message: "Tipo de ticket creado con exito.", ticketType: newEventTicketType });

  } catch (error) {
    console.error("Error al crear el tipo de evento. ", error);
    return res.status(500).json("Error al crear el tipo de evento. Algo salio mal en el servidor.");
  }
}

export const getEventTicketTypes = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json("El ID del evento es requerido.");
    }

    const eventTicketTypes = await prisma.eventTicketType.findMany({
      where: { eventId }
    });

    return res.status(200).json(eventTicketTypes);
  } catch (error) {
    console.error("Error al obtener los tipos de ticket del evento. ", error);
    return res.status(500).json("Error al obtener los tipos de ticket del evento. Algo salio mal en el servidor.");
  }
}

export const deleteEventTicketType = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json("El ID del tipo de ticket es requerido.");
    }
    await prisma.eventTicketType.delete({
      where: { id }
    });
    return res.status(200).json({ message: "Tipo de ticket eliminado exitosamente." });
  } catch (error) {
    console.error("Error al eliminar el tipo de ticket. ", error);
    return res.status(500).json("Error al eliminar el tipo de ticket. Algo salio mal en el servidor.");
  }
}

export const createEventTicketsBatch = async (req: Request, res: Response) => {
  try {

    const { eventId, ticketTypeId, quantity } = req.body;

    if (!eventId || !ticketTypeId || !quantity) {
      return res.status(400).json("ID del evento, Tipo de evento y cantidad son requeridos.");
    }

    const ticketType = await prisma.eventTicketType.findUnique({
      where: { id: ticketTypeId }
    })

    if (!ticketType) {
      return res.status(404).json("Tipo de ticket no encontrado.");
    }

    const ticketsData = Array.from({ length: quantity }).map((_, index) => ({
      eventId,
      ticketTypeId,
      status: TicketStatus.PENDING,
      code: index.toString().padStart(2, '0').concat(ticketType.name || '')
    }));

    const createdTickets = await prisma.eventTicket.createMany({
      data: ticketsData
    });

    return res.status(201).json({ message: "Lote de tickets creado con exito.", count: createdTickets.count });


  } catch (error) {
    console.error("Error al crear el lote de tickets. ", error);
    return res.status(500).json("Error al crear el lote de tickets. Algo salio mal en el servidor.");
  }
}


