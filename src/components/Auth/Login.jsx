import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Chrome, Apple } from 'lucide-react'

function ErrMsg({ msg }) {
  if (!msg) return null;
  return <div className="text-destructive text-sm mb-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">{msg}</div>;
}

export default function Login({ onSwitchToSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-6 sm:py-8">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Budget App</h1>
          <p className="text-muted-foreground">Welcome back! Please sign in to your account.</p>
        </div>

        {/* Formulario */}
        <Card className="border border-border">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-foreground">Password</label>
                  <button type="button" className="text-sm text-primary hover:text-primary/80">Forgot password?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  id="keep-logged-in"
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring"
                />
                <label htmlFor="keep-logged-in" className="ml-2 text-sm text-foreground">Keep me logged in</label>
              </div>
              <ErrMsg msg={error} />
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg flex items-center justify-center">
                {loading ? 'Signing in...' : 'Sign in'}
                {!loading && <ArrowRight className="ml-2 w-5 h-5" />}
              </Button>
            </form>

            {/* Separador */}
            <div className="mt-6 mb-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </div>

            {/* Botones sociales */}
            <div className="space-y-3">
              <Button variant="outline" className="w-full flex items-center justify-center py-3 text-sm">
                <Chrome className="w-5 h-5 mr-2" />
                Continue with Google
              </Button>
              <Button variant="outline" className="w-full flex items-center justify-center py-3 text-sm">
                <Apple className="w-5 h-5 mr-2" />
                Continue with Apple
              </Button>
            </div>

            {/* Enlace para registrarse */}
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button onClick={onSwitchToSignup} className="text-primary hover:text-primary/80 font-medium">
                  Sign up
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <a href="#" className="hover:text-foreground">Privacy Policy</a>
          <a href="#" className="hover:text-foreground">Terms of Service</a>
          <a href="#" className="hover:text-foreground">Help</a>
        </div>
      </div>
    </div>
  )
}
