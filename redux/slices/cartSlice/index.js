import { createSlice } from '@reduxjs/toolkit';


const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: {}, // Cart items stored by unique product Name or ID
  },
  reducers: {
    addItemToCart: (state, action) => {
      const { product } = action.payload;
      const { id } = product;
    
      if (!id) {

        return; // Prevent invalid updates
      }
    
      if (state.items[id]) {
        // Increment the quantity if the product already exists
        state.items[id].quantity += product.quantity;
      } else {
        // Add new product with the specified quantity
        state.items[id] = product;
      }
    

    },

    // Optional: Remove item from the cart
    removeItemFromCart: (state, action) => {
      const productName = action.payload; // Assume payload is the product's Name
      delete state.items[productName];
    },

    // Optional: Clear the cart
    clearCart: (state) => {
      state.items = {};
    },
  },
});

export const { addItemToCart, removeItemFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
