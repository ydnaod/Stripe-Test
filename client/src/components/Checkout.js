import React, { useEffect, useReducer, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const fetchCheckoutSession = async ({ quantity }) => {
  return fetch('/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      quantity,
    }),
  }).then((res) => res.json());
};

const formatPrice = ({ amount, currency, quantity }) => {
  const numberFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  });
  const parts = numberFormat.formatToParts(amount);
  let zeroDecimalCurrency = true;
  for (let part of parts) {
    if (part.type === 'decimal') {
      zeroDecimalCurrency = false;
    }
  }
  amount = zeroDecimalCurrency ? amount : amount / 100;
  const total = (quantity * amount).toFixed(2);
  return numberFormat.format(total);
};

function reducer(state, action) {
  switch (action.type) {
    case 'useEffectUpdate':
      return {
        ...state,
        ...action.payload,
        price: formatPrice({
          amount: action.payload.unitAmount,
          currency: action.payload.currency,
          quantity: state.quantity,
        }),
      };
    case 'increment':
      return {
        ...state,
        quantity: state.quantity + 1,
        price: formatPrice({
          amount: state.unitAmount,
          currency: state.currency,
          quantity: state.quantity + 1,
        }),
      };
    case 'decrement':
      return {
        ...state,
        quantity: state.quantity - 1,
        price: formatPrice({
          amount: state.unitAmount,
          currency: state.currency,
          quantity: state.quantity - 1,
        }),
      };
    case 'setLoading':
      return { ...state, loading: action.payload.loading };
    case 'setError':
      return { ...state, error: action.payload.error };
    default:
      throw new Error();
  }
}

const Checkout = () => {
  const [state, dispatch] = useReducer(reducer, {
    quantity: 1,
    price: null,
    loading: false,
    error: null,
    stripe: null,
  });

  useEffect(() => {
    async function fetchConfig() {
      // Fetch config from our backend.
      const { publicKey, unitAmount, currency } = await fetch(
        '/config'
      ).then((res) => res.json());
      // Make sure to call `loadStripe` outside of a component’s render to avoid
      // recreating the `Stripe` object on every render.
      dispatch({
        type: 'useEffectUpdate',
        payload: { unitAmount, currency, stripe: await loadStripe(publicKey) },
      });
    }
    fetchConfig();
  }, []);

  const handleClick = async (event) => {
    // Call your backend to create the Checkout session.
    dispatch({ type: 'setLoading', payload: { loading: true } });
    const { sessionId } = await fetchCheckoutSession({
      quantity: state.quantity,
    });
    // When the customer clicks on the button, redirect them to Checkout.
    const { error } = await state.stripe.redirectToCheckout({
      sessionId,
    });
    // If `redirectToCheckout` fails due to a browser or network
    // error, display the localized error message to your customer
    // using `error.message`.
    if (error) {
      dispatch({ type: 'setError', payload: { error } });
      dispatch({ type: 'setLoading', payload: { loading: false } });
    }
  };

  const [inputs, setInputs] = useState({
    name: '',
    email: '',
    feeType: '',
    campus: '',
    program: ''
  })

  const { name, email, feeType, campus, program } = inputs;

  const handleChange = (e) => {
    setInputs({...inputs, [e.target.name]: e.target.value});
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
        const body = {
            name, email, feeType, campus, program
        }
        try {
            const response = await fetch("/create-customer", {
                method: "POST",
                headers: { "Content-Type" : "application/json" } ,
                body: JSON.stringify(body)
            });

            const parseRes = await response.json();
            const customerId = parseRes.id;
            const invoiceBody = {
              name, email, feeType, campus, program, customerId
            }
            try {
              const invoiceResponse = await fetch("/create-invoice", {
                method: "POST",
                headers: { "Content-Type" : "application/json" } ,
                body: JSON.stringify(invoiceBody)
            });

            const parseInvoiceRes = await parseInvoiceRes.json();
            console.log(parseInvoiceRes);
            } catch (error) {
              console.error(error.message)
            }
        } catch (error) {
            console.error(error.message);
        }
  }

  return (
    <div className="sr-root">
      <div className="sr-main">
        <header className="sr-header">
          <div className="sr-header__logo"></div>
        </header>
        <section className="container">

          <div>
            <form onSubmit={handleSubmit}>
              <input type="name" placeholder="name" name="name" value={name} onChange={handleChange}></input>
              <input type="email" placeholder="email" name="email" value={email} onChange={handleChange}></input>
              <select name="feeType" value={feeType} onChange={handleChange}>
                <option value="registration">Registration Fee</option>
                <option value="kit">Kit Fee</option>
              </select>
              <select name="campus" value={campus} onChange={handleChange}>
                <option value="allentown">Allentown</option>
                <option value="ambler">Ambler</option>
                <option value="philadelphia">Philadelphia</option>
                <option value="stroudsburg">Stroudsburg</option>
              </select>
              <select name="program" value={program} onChange={handleChange}>
                <option value="cosmetology">Cosmetology</option>
                <option value="esthetics">Esthetics</option>
                <option value="teacher">Teacher</option>
              </select>
            </form>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!state.stripe || state.loading}
          >
            {state.loading || !state.price
              ? `Loading...`
              : `Submit`}
          </button>
          <div className="sr-field-error">{state.error?.message}</div>
        </section>
      </div>
    </div>
  );
};

export default Checkout;
