import { useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Checkbox } from '../ui/Checkbox'
import { Card, CardContent } from '../ui/Card'
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
  const [googleLoading, setGoogleLoading] = useState(false)
  const { signIn, signInWithGoogle } = useAuth()
  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  const focusFirstMissingRequiredField = () => {
    const requiredFields = [
      { value: email?.trim(), ref: emailRef },
      { value: password, ref: passwordRef },
    ]
    const missingField = requiredFields.find(field => !field.value)
    if (missingField?.ref?.current) {
      missingField.ref.current.focus()
      return true
    }
    return false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (focusFirstMissingRequiredField()) {
      setError('Completa los campos obligatorios.')
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    const { error: googleError } = await signInWithGoogle()
    if (googleError) {
      setError(googleError.message || 'No fue posible iniciar con Google.')
      setGoogleLoading(false)
    }
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
          <p className="text-muted-foreground">Bienvenido de nuevo. Inicia sesión para continuar.</p>
        </div>

        {/* Formulario */}
        <Card className="border border-border">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ingresa tu correo"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-foreground">Contraseña</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
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
              <div className="flex items-center gap-2">
                <Checkbox
                  id="keep-logged-in"
                  checked={keepLoggedIn}
                  onCheckedChange={(checked) => setKeepLoggedIn(Boolean(checked))}
                />
                <label htmlFor="keep-logged-in" className="text-sm text-foreground">Mantener sesión iniciada</label>
              </div>
              <ErrMsg msg={error} />
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg flex items-center justify-center">
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
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
                  <span className="px-2 bg-card text-muted-foreground">O continúa con</span>
                </div>
              </div>
            </div>

            {/* Botones sociales */}
            <div className="space-y-3">
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                variant="outline"
                className="w-full flex items-center justify-center py-3 text-sm"
              >
                <Chrome className="w-5 h-5 mr-2" />
                {googleLoading ? 'Redirigiendo a Google...' : 'Continuar con Google'}
              </Button>
              <Button disabled variant="outline" className="w-full flex items-center justify-center py-3 text-sm">
                <Apple className="w-5 h-5 mr-2" />
                Continuar con Apple
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Apple estará disponible pronto.
            </p>
            <Button
              type="button"
              onClick={onSwitchToSignup}
              className="mt-6 w-full border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
            >
              Crear una cuenta nueva
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <a href="#" className="hover:text-foreground">Política de privacidad</a>
          <a href="#" className="hover:text-foreground">Términos del servicio</a>
          <a href="#" className="hover:text-foreground">Ayuda</a>
        </div>
      </div>
    </div>
  )
}
