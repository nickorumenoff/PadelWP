import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import PaymentForm from "./PaymentForm";

const mockSubmitPayment = jest.fn();
jest.mock("../lib/api", () => ({
  api: {
    submitPayment: (...args: unknown[]) => mockSubmitPayment(...args),
  },
}));

describe("PaymentForm", () => {
  beforeEach(() => {
    mockSubmitPayment.mockReset();
  });

  it("envía el pago con los valores por defecto (USD, Pago Móvil) y el monto inicial", async () => {
    mockSubmitPayment.mockResolvedValue({ id: "pay_1" });
    render(<PaymentForm purpose="BOOKING" relatedId="booking_1" defaultAmount={15} />);

    fireEvent.press(screen.getByText("Reportar pago"));

    await waitFor(() => {
      expect(mockSubmitPayment).toHaveBeenCalledWith({
        amount: 15,
        currency: "USD",
        method: "PAGO_MOVIL",
        reference: "",
        purpose: "BOOKING",
        relatedId: "booking_1",
      });
    });
  });

  it("permite cambiar moneda, método y referencia antes de enviar", async () => {
    mockSubmitPayment.mockResolvedValue({ id: "pay_2" });
    render(<PaymentForm purpose="SPONSORSHIP" defaultAmount={50} />);

    fireEvent.press(screen.getByText("VES"));
    fireEvent.press(screen.getByText("Zelle"));
    fireEvent.changeText(screen.getByPlaceholderText("Ej. últimos 4 dígitos o ID de transacción"), "REF-123");
    fireEvent.press(screen.getByText("Reportar pago"));

    await waitFor(() => {
      expect(mockSubmitPayment).toHaveBeenCalledWith({
        amount: 50,
        currency: "VES",
        method: "ZELLE",
        reference: "REF-123",
        purpose: "SPONSORSHIP",
        relatedId: undefined,
      });
    });
  });

  it("muestra el mensaje de confirmación tras un envío exitoso y llama a onDone", async () => {
    mockSubmitPayment.mockResolvedValue({ id: "pay_3" });
    const onDone = jest.fn();
    render(<PaymentForm purpose="CLUB_PLAN" defaultAmount={30} onDone={onDone} />);

    fireEvent.press(screen.getByText("Reportar pago"));

    await waitFor(() => {
      expect(screen.getByText("Reporte de pago recibido. Un administrador lo verificará pronto.")).toBeTruthy();
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("muestra un error y no rompe la UI si el envío falla (ej. usuario no autenticado)", async () => {
    mockSubmitPayment.mockRejectedValue(new Error("401"));
    render(<PaymentForm purpose="BOOKING" defaultAmount={20} />);

    fireEvent.press(screen.getByText("Reportar pago"));

    await waitFor(() => {
      expect(screen.getByText("No se pudo registrar el pago. ¿Iniciaste sesión?")).toBeTruthy();
    });
    expect(mockSubmitPayment).toHaveBeenCalledTimes(1);
  });

  it("convierte un monto no numérico a 0 en vez de romper", async () => {
    mockSubmitPayment.mockResolvedValue({ id: "pay_4" });
    render(<PaymentForm purpose="BOOKING" defaultAmount={10} />);

    fireEvent.changeText(screen.getByPlaceholderText("Monto"), "abc");
    fireEvent.press(screen.getByText("Reportar pago"));

    await waitFor(() => {
      expect(mockSubmitPayment).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 0 })
      );
    });
  });
});
