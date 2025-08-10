import { createClient, RedisClientType } from 'redis'

class RedisClient {
  private client: RedisClientType | null = null
  private connecting = false

  async getClient(): Promise<RedisClientType> {
    if (this.client && this.client.isOpen) {
      return this.client
    }

    if (this.connecting) {
      // Wait for connection to complete
      while (this.connecting) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (this.client && this.client.isOpen) {
        return this.client
      }
    }

    this.connecting = true

    try {
      // Create Redis client with connection string or default local config
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
      
      this.client = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      })

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err)
      })

      this.client.on('connect', () => {
        console.log('✅ Redis connected')
      })

      this.client.on('disconnect', () => {
        console.log('❌ Redis disconnected')
      })

      await this.client.connect()
      this.connecting = false
      return this.client
    } catch (error) {
      this.connecting = false
      console.error('Failed to connect to Redis:', error)
      
      // Fallback to in-memory storage if Redis is not available
      console.warn('⚠️  Redis not available - falling back to in-memory storage')
      throw new Error('Redis connection failed')
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.client.isOpen) {
      await this.client.disconnect()
      this.client = null
    }
  }

  // Auth code specific methods
  async setAuthCode(email: string, code: string, attempts: number = 0): Promise<void> {
    try {
      const client = await this.getClient()
      const key = `auth_code:${email.toLowerCase()}`
      const value = JSON.stringify({
        code,
        expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        attempts
      })
      
      // Set with expiration of 10 minutes (600 seconds)
      await client.setEx(key, 600, value)
    } catch (error) {
      console.error('Redis setAuthCode error:', error)
      throw error
    }
  }

  async getAuthCode(email: string): Promise<{
    code: string
    expires: Date
    attempts: number
  } | null> {
    try {
      const client = await this.getClient()
      const key = `auth_code:${email.toLowerCase()}`
      const value = await client.get(key)
      
      if (!value) return null
      
      const parsed = JSON.parse(value)
      return {
        code: parsed.code,
        expires: new Date(parsed.expires),
        attempts: parsed.attempts
      }
    } catch (error) {
      console.error('Redis getAuthCode error:', error)
      throw error
    }
  }

  async updateAuthCodeAttempts(email: string, attempts: number): Promise<void> {
    try {
      const existingAuth = await this.getAuthCode(email)
      if (existingAuth) {
        await this.setAuthCode(email, existingAuth.code, attempts)
      }
    } catch (error) {
      console.error('Redis updateAuthCodeAttempts error:', error)
      throw error
    }
  }

  async deleteAuthCode(email: string): Promise<void> {
    try {
      const client = await this.getClient()
      const key = `auth_code:${email.toLowerCase()}`
      await client.del(key)
    } catch (error) {
      console.error('Redis deleteAuthCode error:', error)
      throw error
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient()

// Graceful shutdown
process.on('SIGINT', async () => {
  await redisClient.disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await redisClient.disconnect()
  process.exit(0)
})
