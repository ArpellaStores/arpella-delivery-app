import { api } from "./index";

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/login?platform=mobile",
        method: "POST",
        body: {
          userName: credentials.userName || credentials.phoneNumber || credentials.phone,
          password: credentials.password,
        },
      }),
    }),

    register: builder.mutation({
      query: (userData) => {
        const { passwordHash, ...rest } = userData;
        return {
          url: "/register?platform=mobile",
          method: "POST",
          body: {
            ...rest,
            password: userData.password || passwordHash,
          },
        };
      },
    }),

    sendOtp: builder.mutation({
      query: ({ username }) => ({
        url: `/send-otp?username=${username}&platform=mobile`,
        method: "GET",
      }),
    }),

    verifyOtp: builder.mutation({
      query: ({ username, otp }) => ({
        url: `/verify-otp?username=${username}&otp=${otp}&platform=mobile`,
        method: "POST",
      }),
    }),

    resetPassword: builder.mutation({
      async queryFn(args, _queryApi, _extraOptions, fetchWithBQ) {
        const { otp, phoneNumber, password } = args;
        const body = {
          userId: phoneNumber,
          newpassword: password,
          confirmPassword: password,
        };
        const url = `/reset-password?otp=${otp}&platform=mobile`;

        let result = await fetchWithBQ({
          url,
          method: "POST",
          body,
        });

        if (result.error && (result.error.status === 404 || result.error.status === 405)) {
          result = await fetchWithBQ({
            url,
            method: "PUT",
            body,
          });
        }

        return result;
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useResetPasswordMutation,
} = authApi;
