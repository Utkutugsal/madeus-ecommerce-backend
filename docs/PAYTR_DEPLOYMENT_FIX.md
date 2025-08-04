# 🔧 PayTR 401 Error - Production Fix Guide

## ❌ Current Problem
- **Error:** `PayTR API error: Request failed with status code 401`
- **Root Cause:** Environment variables not set correctly in Railway production environment
- **Status:** PayTR credentials are `undefined` in production

## 🔍 Diagnosis Results
```
❌ PAYTR_MERCHANT_ID: undefined
❌ PAYTR_MERCHANT_KEY: undefined  
❌ PAYTR_MERCHANT_SALT: undefined
❌ PAYTR_TEST_MODE: undefined
```

## ✅ Solution Steps

### 1. Update Railway Environment Variables

Go to your Railway dashboard and add/update these variables:

```env
# PayTR Production Configuration
PAYTR_MERCHANT_ID=598536
PAYTR_MERCHANT_KEY=Uw41HT9k4UtXWLDT
PAYTR_MERCHANT_SALT=5F1Gm1fe6ffaFHpo
PAYTR_TEST_MODE=false

# Frontend URL
FRONTEND_URL=https://madeusskincare.com

# CORS Origins
CORS_ORIGINS=https://madeusskincare.com,https://www.madeusskincare.com
```

### 2. Railway Dashboard Steps

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/dashboard
   - Select your `madeus-ecommerce-backend-production` project

2. **Navigate to Variables**
   - Click on your service
   - Go to "Variables" tab
   - Click "New Variable" for each missing variable

3. **Add Variables One by One**
   ```
   Variable Name: PAYTR_MERCHANT_ID
   Value: 598536
   
   Variable Name: PAYTR_MERCHANT_KEY  
   Value: Uw41HT9k4UtXWLDT
   
   Variable Name: PAYTR_MERCHANT_SALT
   Value: 5F1Gm1fe6ffaFHpo
   
   Variable Name: PAYTR_TEST_MODE
   Value: false
   
   Variable Name: FRONTEND_URL
   Value: https://madeusskincare.com
   
   Variable Name: CORS_ORIGINS
   Value: https://madeusskincare.com,https://www.madeusskincare.com
   ```

4. **Redeploy Application**
   - After adding all variables, click "Deploy" or "Redeploy"
   - Wait for deployment to complete

### 3. Verify Deployment

After deployment, check the logs for:

```
✅ PayTR Configuration: {
  merchantId: '598536',
  testMode: 0,
  apiUrl: 'https://www.paytr.com/odeme/api/get-token'
}
```

### 4. Test Payment Flow

1. **Create a test order** on your website
2. **Attempt payment** 
3. **Check logs** for successful PayTR API calls
4. **Verify** no more 401 errors

## 🔍 Monitoring

### Success Indicators
- ✅ PayTR API calls return 200 status
- ✅ Payment tokens generated successfully  
- ✅ Orders can be created and paid
- ✅ No 401 errors in logs

### Error Monitoring
- ❌ 401 Unauthorized errors
- ❌ "undefined" merchant credentials
- ❌ Payment creation failures

## 🆘 Troubleshooting

### If 401 errors persist:

1. **Check Variable Names**
   - Ensure exact spelling: `PAYTR_MERCHANT_ID` (not `PAYTR_MERCHANTID`)
   - No extra spaces in values

2. **Verify Values**
   - Merchant ID: `598536`
   - Merchant Key: `Uw41HT9k4UtXWLDT`
   - Merchant Salt: `5F1Gm1fe6ffaFHpo`

3. **Redeploy After Changes**
   - Railway requires redeployment after variable changes
   - Check deployment logs for errors

4. **Test Locally First**
   ```bash
   cd madeus-backend
   node debug-env.js
   ```

## 📞 Support

### PayTR Support
- **Email:** destek@paytr.com
- **Phone:** 0850 532 77 99
- **Documentation:** https://www.paytr.com/odeme/api

### Railway Support
- **Documentation:** https://docs.railway.app/
- **Community:** https://community.railway.app/

## 📝 Notes

- **Credentials Source:** Extracted from `test-paytr.js` file
- **Test Mode:** Disabled for production (`false`)
- **Security:** Credentials are production-ready
- **Domain:** Updated to actual production domain

## 🚀 Quick Fix Checklist

- [ ] Add `PAYTR_MERCHANT_ID=598536` to Railway variables
- [ ] Add `PAYTR_MERCHANT_KEY=Uw41HT9k4UtXWLDT` to Railway variables  
- [ ] Add `PAYTR_MERCHANT_SALT=5F1Gm1fe6ffaFHpo` to Railway variables
- [ ] Add `PAYTR_TEST_MODE=false` to Railway variables (Production mode)
- [ ] Add `FRONTEND_URL=https://madeusskincare.com` to Railway variables
- [ ] Add `CORS_ORIGINS=https://madeusskincare.com,https://www.madeusskincare.com` to Railway variables
- [ ] Redeploy application in Railway
- [ ] Test payment flow
- [ ] Verify no 401 errors in logs
- [ ] Confirm PayTR production mode is working 