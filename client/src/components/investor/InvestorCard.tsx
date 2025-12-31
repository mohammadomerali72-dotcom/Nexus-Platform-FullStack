"use client"

import type React from "react"
import { useNavigate } from "react-router-dom"
import { MessageCircle, ExternalLink } from "lucide-react"
import type { Investor } from "../../types"
import { Card, CardBody, CardFooter } from "../ui/Card"
import { Avatar } from "../ui/Avatar"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"

interface InvestorCardProps {
  investor: Investor
  showActions?: boolean
}

export const InvestorCard: React.FC<InvestorCardProps> = ({ investor, showActions = true }) => {
  const navigate = useNavigate()

  const profileData = (investor as any).profile || investor

  // Extract investment data with proper fallbacks
  const investmentStage = Array.isArray(profileData.investmentStage)
    ? profileData.investmentStage
    : Array.isArray(investor.investmentStage)
      ? investor.investmentStage
      : []

  const investmentInterests = Array.isArray(profileData.investmentInterests)
    ? profileData.investmentInterests
    : Array.isArray(investor.investmentInterests)
      ? investor.investmentInterests
      : []

  const totalInvestments = profileData.totalInvestments ?? investor.totalInvestments ?? 0

  // Format investment range properly
  const minimumInvestment = profileData.minimumInvestment || investor.minimumInvestment
  const maximumInvestment = profileData.maximumInvestment || investor.maximumInvestment

  const investmentRange = minimumInvestment && maximumInvestment ? `${minimumInvestment} - ${maximumInvestment}` : "N/A"

  const handleViewProfile = () => {
    navigate(`/profile/investor/${investor.id}`)
  }

  const handleMessage = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/chat/${investor.id}`)
  }

  return (
    <Card hoverable className="transition-all duration-300 h-full" onClick={handleViewProfile}>
      <CardBody className="flex flex-col">
        <div className="flex items-start">
          <Avatar
            src={investor.avatarUrl}
            alt={investor.name}
            size="lg"
            status={investor.isOnline ? "online" : "offline"}
            className="mr-4"
          />

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{investor.name}</h3>
            <p className="text-sm text-gray-500 mb-2">Investor • {totalInvestments} investments</p>

            {investmentStage.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {(investmentStage as string[]).map((stage, index) => (
                  <Badge key={index} variant="secondary" size="sm">
                    {stage}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {investmentInterests.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Investment Interests</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{investmentInterests.join(", ")}</p>
          </div>
        )}

        {investor.bio && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 line-clamp-2">{investor.bio}</p>
          </div>
        )}

        <div className="mt-3 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-500">Investment Range</span>
            <p className="text-sm font-medium text-gray-900">{investmentRange}</p>
          </div>
        </div>
      </CardBody>

      {showActions && (
        <CardFooter className="border-t border-gray-100 bg-gray-50 flex justify-between">
          <Button variant="outline" size="sm" leftIcon={<MessageCircle size={16} />} onClick={handleMessage}>
            Message
          </Button>

          <Button variant="primary" size="sm" rightIcon={<ExternalLink size={16} />} onClick={handleViewProfile}>
            View Profile
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}




