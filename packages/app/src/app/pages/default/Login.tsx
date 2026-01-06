import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, PasswordInput, Checkbox, Button, Title, Text, Tooltip, LoadingOverlay, Group, Divider } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

import { axios, tokenManager } from '@lib/axios';
import { appStateManager } from '@lib/appState';
import classes from './Login.module.scss';

// Define minimal types needed for the auto-login logic
interface AccountInfo {
  complexId: string;
  complexName: string;
  role: string;
  permissions: string[];
}

const Login = () => {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);

  const [emailCredentials, setEmailCredentials] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  // --- NEW: Simulation Helper ---
  const handleMockLogin = (role: string) => {
    // 1. Fake the Token (Passes TokenManager checks)
    tokenManager.setCredentials({
      complexId: 'dev-complex-id',
      role: role,
      accessToken: 'mock-dev-token',
      accessTokenExpiry: new Date(Date.now() + 86400000), // Valid for 24 hours
    });

    // 2. Fake the User Profile (Passes AppState checks)
    appStateManager.setState({
      userId: 'dev-user-id',
      fullName: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}`, // e.g., "Dev Admin"
      profilePhotoUrl: null,
      projectId: 'dev-complex-id',
      projectName: 'Development Project',
      role: role as any,
      permissions: ['all'],
    });

    // 3. Show success and navigate
    notifications.show({
      title: 'Dev Mode',
      message: `Simulating login as ${role}`,
      color: 'orange',
    });
    navigate(`/${role}/dashboard`);
  };

  // --- 1. Helper Function: Auto-select account and Redirect ---
  const initializeUserSession = async () => {
    try {
      setIsInitializing(true);
      
      // A. Fetch available accounts
      const accountsRes = await axios.get('/iam/v1/metadata/accounts');
      
      // Parse the response to get a flat list of accounts
      const accounts = Object.values(accountsRes.data).filter(Array.isArray).flat().filter(Boolean) as AccountInfo[];

      if (accounts.length === 0) {
        throw new Error('No active roles found for this user.');
      }

      // B. Select the first available account (Single Tenant Logic)
      const targetAccount = accounts[0]; 

      // C. Exchange token for this specific Role/Context
      await tokenManager.getAccessToken(targetAccount.complexId, targetAccount.role);
      
      // D. Fetch User Metadata
      const userMetaRes = await axios.get('/iam/v1/metadata/user');

      // E. Update App State
      appStateManager.setState({
        userId: userMetaRes.data.id,
        fullName: userMetaRes.data.fullName,
        profilePhotoUrl: userMetaRes.data.userPhotoUrl,
        projectId: targetAccount.complexId,
        projectName: targetAccount.complexName,
        role: targetAccount.role as any,
        permissions: targetAccount.permissions,
      });

      notifications.show({
        title: 'Welcome back',
        message: `Logged in as ${targetAccount.role}`,
        color: 'green',
      });

      // F. Redirect directly to the dashboard
      navigate(`/${targetAccount.role}/dashboard`);

    } catch (error) {
      console.error("Session initialization failed", error);
      notifications.show({
        title: 'Login Error',
        message: 'Could not load user profile or role.',
        color: 'red',
      });
      tokenManager.clearTokens();
    } finally {
      setIsInitializing(false);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Check if we already have a valid session on load
    axios.get('/iam/v1/metadata/accounts')
      .then(() => {
        // If authenticated, run the auto-select logic immediately
        initializeUserSession();
      })
      .catch(() => {
        setIsSubmitting(false); // Not authenticated, show login form
      });
  }, []);

  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  const handleEmailInputChange = (field: 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailCredentials({ ...emailCredentials, [field]: e.target.value });
  };

  const handleEmailRememberMeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailCredentials({ ...emailCredentials, rememberMe: e.target.checked });
  };
  
  const handleEmailLogin = () => {
    if (emailCredentials.email === '' || emailCredentials.password === '' || isSubmitting) return;

    setIsSubmitting(true);

    axios.post('/iam/v1/authenticate/email', {
        email: emailCredentials.email,
        password: emailCredentials.password,
        rememberMe: emailCredentials.rememberMe,
      })
      .then(() => {
        initializeUserSession();
      })
      .catch(() => {
        notifications.show({ title: 'Failed to login', message: 'Invalid email or password', color: 'red' });
        setIsSubmitting(false);
      });
  };

  const handleEnterKey = (e: React.KeyboardEvent<HTMLInputElement>, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className={classes.wrapper}>
      {/* Overlay to block interaction during the "Auto-Select" phase */}
      <LoadingOverlay visible={isInitializing} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      
      <div className={classes.loginBox}>
        <div className={classes.formContainer}>
          <Title order={2} className={classes.title} ta="center" m={20}>
            MyInvoice
          </Title>

          <TextInput
            label="Email address"
            placeholder="hello@example.com"
            mt="md"
            size="sm"
            ref={emailInputRef}
            value={emailCredentials.email}
            onChange={handleEmailInputChange('email')}
            onKeyDown={(e) => handleEnterKey(e, handleEmailLogin)}
            disabled={isSubmitting}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            mt="md"
            size="sm"
            value={emailCredentials.password}
            onChange={handleEmailInputChange('password')}
            onKeyDown={(e) => handleEnterKey(e, handleEmailLogin)}
            disabled={isSubmitting}
          />
          <Tooltip label="Do not use this feature on public or shared devices">
            <Checkbox
              label="Remember me for 7 days"
              mt="sm"
              size="sm"
              checked={emailCredentials.rememberMe}
              onChange={handleEmailRememberMeChange}
              disabled={isSubmitting}
            />
          </Tooltip>

          <Button.Group mt="md" className={classes.buttonShadow}>
            <Button fullWidth size="sm" onClick={handleEmailLogin} disabled={isSubmitting} loading={isSubmitting && !isInitializing}>
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </Button>
            <Button variant="outline" fullWidth size="sm" disabled={isSubmitting}>
              Forgot Password ?
            </Button>
          </Button.Group>


          {/* --- NEW: Temporary Debug Section --- */}
          <Divider label="Dev Tools (Remove in Prod)" labelPosition="center" my="lg" />
          <Group grow>
              <Button 
                  variant="light" 
                  color="red" 
                  size="xs" 
                  onClick={() => handleMockLogin('admin')}
              >
                  Test Admin
              </Button>
              <Button 
                  variant="light" 
                  color="blue" 
                  size="xs" 
                  onClick={() => handleMockLogin('staff')}
              >
                  Test Staff
              </Button>
          </Group>


          <Text ta="center" mt="xs" size="sm">
            Don&apos;t have an account?{' '}
            <Button variant='transparent' onClick={() => navigate('/register')}>Register</Button>
          </Text>
        </div>
        
        <div className={classes.ribbon1} />
        <div className={classes.ribbon2} />
        <div className={classes.ribbon3} />

        <div className={classes.animationContainer}>
          <DotLottieReact
            className={classes.lottiePlayer}
            src="./images/landscape.lottie"
            loop
            autoplay
            backgroundColor="#000"
            speed={0.5}
            renderConfig={{ autoResize: true }}
          />
        </div>
      </div>
    </div>
  );
}

export default Login;