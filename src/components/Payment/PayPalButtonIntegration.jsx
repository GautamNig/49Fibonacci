// src/components/Payment/PayPalButtonIntegration.jsx

import React, { useEffect, useRef, useState } from "react";
import { paypalConfig } from "../../config/paypal";

const PayPalButtonIntegration = ({
  amount,
  description,
  onApprove,
  onError,
  disabled
}) => {
  const paypalRef = useRef();
  const [sdkReady, setSdkReady] = useState(false);

  // 1️⃣ Load PayPal SDK
  useEffect(() => {
    // If already loaded → don't load again
    if (window.paypal) {
      setSdkReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.clientId}&currency=${paypalConfig.currency}`;
    script.async = true;

    script.onload = () => {
      setSdkReady(true);
    };

    script.onerror = () => {
      onError(new Error("Failed to load PayPal script"));
    };

    document.body.appendChild(script);
  }, []);

  // 2️⃣ Render PayPal Buttons when SDK is ready
  useEffect(() => {
    if (!sdkReady || !window.paypal || disabled) return;

    const buttons = window.paypal.Buttons({
      style: {
        layout: "vertical",
        color: "blue",
        shape: "pill",
        label: "paypal",
      },

      createOrder(_, actions) {
        return actions.order.create({
          purchase_units: [
            {
              description,
              amount: {
                value: amount.toString(),
              },
            },
          ],
        });
      },

      async onApprove(data, actions) {
        try {
          const details = await actions.order.capture();

          onApprove(
            data.orderID,
            details.payer?.name?.given_name,
            details.payer?.email_address
          );
        } catch (error) {
          onError(error);
        }
      },

      onError(err) {
        onError(err);
      },
    });

    buttons.render(paypalRef.current);

    return () => {
      if (buttons.close) buttons.close();
    };
  }, [sdkReady, amount, description, disabled]);

  return (
    <div>
      {!sdkReady && <div>Loading PayPal…</div>}
      <div ref={paypalRef}></div>
    </div>
  );
};

export default PayPalButtonIntegration;
