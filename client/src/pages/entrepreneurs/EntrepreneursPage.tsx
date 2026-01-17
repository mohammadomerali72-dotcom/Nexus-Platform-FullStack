"use client"

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "../../components/ui/Input";
import { EntrepreneurCard } from "../../components/entrepreneur/EntrepreneurCard";
import api from "../../services/api"; 
import type { Entrepreneur } from "../../types";

export const EntrepreneursPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEntrepreneurs = async () => {
      try {
        setIsLoading(true);
        // GET /api/auth/entrepreneurs from your Node.js backend
        const response = await api.get('/auth/entrepreneurs');
        
        const mappedData = response.data.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          startupName: user.name + " Ventures",
          industry: "Technology",
          bio: user.bio || "Registered Nexus Entrepreneur.",
          location: "Global",
          fundingNeeded: "$100K - $500K"
        }));
        setEntrepreneurs(mappedData);
      } catch (error) {
        console.error("Database fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadEntrepreneurs();
  }, []);

  const filteredEntrepreneurs = entrepreneurs.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Startup Discovery</h1>
        <p className="text-gray-500">Live data from XAMPP MySQL</p>
      </div>
      
      <div className="max-w-xl">
        <Input
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          startAdornment={<Search size={20} />}
          fullWidth
        />
      </div>

      {isLoading ? (
        <div className="py-20 text-center">Loading from Database...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntrepreneurs.map((entrepreneur) => (
            <Link to={`/profile/entrepreneur/${entrepreneur.id}`} key={entrepreneur.id}>
              <EntrepreneurCard entrepreneur={entrepreneur} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};